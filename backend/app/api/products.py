from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.product import Product, Competitor, PriceSnapshot
from app.schemas import ProductCreate, ProductOut, PriceSnapshotOut, PriceRecommendation
from app.pricing.engine import (
    compute_elasticity,
    recommend_price,
    build_demand_proxy_from_snapshots,
    get_confidence_label,
)

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=List[ProductOut])
async def list_products(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product).where(Product.owner_id == current_user.id, Product.is_active == True)
    )
    return result.scalars().all()


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(
    product_in: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    product = Product(
        name=product_in.name,
        description=product_in.description,
        category=product_in.category,
        my_price=product_in.my_price,
        target_margin=product_in.target_margin,
        interval=product_in.interval,
        owner_id=current_user.id,
    )
    db.add(product)
    await db.flush()

    for comp_in in product_in.competitors:
        comp = Competitor(
            product_id=product.id,
            name=comp_in.name,
            url=comp_in.url,
            css_selector=comp_in.css_selector,
        )
        db.add(comp)

    await db.commit()
    await db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.owner_id == current_user.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return product


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.owner_id == current_user.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    product.is_active = False
    await db.commit()


@router.get("/{product_id}/snapshots", response_model=List[PriceSnapshotOut])
async def get_snapshots(
    product_id: int,
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    competitor_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(PriceSnapshot)
        .join(Product, PriceSnapshot.product_id == Product.id)
        .where(PriceSnapshot.product_id == product_id, Product.owner_id == current_user.id)
    )
    if from_date:
        query = query.where(PriceSnapshot.scraped_at >= from_date)
    if to_date:
        query = query.where(PriceSnapshot.scraped_at <= to_date)
    if competitor_id:
        query = query.where(PriceSnapshot.competitor_id == competitor_id)
    query = query.order_by(PriceSnapshot.scraped_at.desc()).limit(500)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{product_id}/recommendation", response_model=PriceRecommendation)
async def get_recommendation(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.owner_id == current_user.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    snap_result = await db.execute(
        select(PriceSnapshot.price)
        .where(PriceSnapshot.product_id == product_id, PriceSnapshot.success == True)
        .order_by(PriceSnapshot.scraped_at.desc())
        .limit(100)
    )
    prices = [r[0] for r in snap_result.fetchall()]

    if len(prices) < 5:
        return PriceRecommendation(
            product_id=product_id,
            current_price=product.my_price,
            recommended_price=product.my_price or 0.0,
            elasticity=0.0,
            confidence="low",
            rationale="Insufficient data. Need at least 5 price snapshots.",
            data_points=len(prices),
        )

    demand_proxy = build_demand_proxy_from_snapshots(prices)
    elasticity, r2 = compute_elasticity(prices, demand_proxy)
    cost_estimate = (product.my_price or prices[0]) * 0.6
    rec_price = recommend_price(elasticity, cost_estimate, product.my_price or prices[0], product.target_margin)
    confidence = get_confidence_label(r2, len(prices))

    return PriceRecommendation(
        product_id=product_id,
        current_price=product.my_price,
        recommended_price=round(rec_price, 2),
        elasticity=round(elasticity, 3),
        confidence=confidence,
        rationale=(
            f"Based on {len(prices)} price snapshots, estimated demand elasticity is {elasticity:.2f} "
            f"(R²={r2:.2f}). {'Elastic demand — cutting price may grow revenue.' if elasticity < -1 else 'Inelastic demand — holding price may protect margin.'}"
        ),
        data_points=len(prices),
    )


@router.post("/{product_id}/scrape")
async def trigger_scrape(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.owner_id == current_user.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    comp_result = await db.execute(
        select(Competitor).where(Competitor.product_id == product_id, Competitor.is_active == True)
    )
    competitors = comp_result.scalars().all()

    from app.scraper.tasks import scrape_competitor
    for comp in competitors:
        scrape_competitor.delay(comp.id)

    return {"dispatched": len(competitors)}
