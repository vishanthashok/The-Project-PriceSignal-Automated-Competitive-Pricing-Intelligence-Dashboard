import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.main import app
from app.core.database import Base, get_db

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    app.dependency_overrides[get_db] = override_get_db
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers(client):
    await client.post("/api/auth/register", json={
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpassword123",
    })
    response = await client.post("/api/auth/login", data={
        "username": "test@example.com",
        "password": "testpassword123",
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_register_user(client):
    response = await client.post("/api/auth/register", json={
        "email": "newuser@example.com",
        "username": "newuser",
        "password": "securepassword",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {"email": "dup@example.com", "username": "dup1", "password": "pass"}
    await client.post("/api/auth/register", json=payload)
    payload["username"] = "dup2"
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post("/api/auth/register", json={
        "email": "login@example.com", "username": "loginuser", "password": "mypassword"
    })
    response = await client.post("/api/auth/login", data={
        "username": "login@example.com", "password": "mypassword"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/auth/register", json={
        "email": "bad@example.com", "username": "baduser", "password": "correct"
    })
    response = await client.post("/api/auth/login", data={
        "username": "bad@example.com", "password": "wrong"
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_products_empty(client, auth_headers):
    response = await client.get("/api/products", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_create_product(client, auth_headers):
    response = await client.post("/api/products", headers=auth_headers, json={
        "name": "Widget Pro",
        "category": "electronics",
        "my_price": 99.99,
        "competitors": [
            {"name": "Amazon", "url": "https://amazon.com/widget", "css_selector": ".a-price"}
        ]
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Widget Pro"
    assert len(data["competitors"]) == 1


@pytest.mark.asyncio
async def test_get_product_not_found(client, auth_headers):
    response = await client.get("/api/products/9999", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_product(client, auth_headers):
    create = await client.post("/api/products", headers=auth_headers, json={
        "name": "To Delete", "my_price": 50.0
    })
    product_id = create.json()["id"]
    delete = await client.delete(f"/api/products/{product_id}", headers=auth_headers)
    assert delete.status_code == 204
    get = await client.get(f"/api/products/{product_id}", headers=auth_headers)
    assert get.status_code == 404


@pytest.mark.asyncio
async def test_get_snapshots_empty(client, auth_headers):
    create = await client.post("/api/products", headers=auth_headers, json={
        "name": "Snap Test", "my_price": 100.0
    })
    product_id = create.json()["id"]
    response = await client.get(f"/api/products/{product_id}/snapshots", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_recommendation_insufficient_data(client, auth_headers):
    create = await client.post("/api/products", headers=auth_headers, json={
        "name": "New Product", "my_price": 75.0
    })
    product_id = create.json()["id"]
    response = await client.get(f"/api/products/{product_id}/recommendation", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["confidence"] == "low"
    assert "Insufficient" in data["rationale"]


@pytest.mark.asyncio
async def test_alerts_empty(client, auth_headers):
    response = await client.get("/api/alerts", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_unread_alerts_empty(client, auth_headers):
    response = await client.get("/api/alerts/unread", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_protected_route_no_token(client):
    response = await client.get("/api/products")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_invalid_token(client):
    response = await client.get("/api/products", headers={"Authorization": "Bearer badtoken"})
    assert response.status_code == 401
