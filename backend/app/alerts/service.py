import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.product import Alert, Product
from app.models.user import User
from app.pricing.engine import recommend_price, build_demand_proxy_from_snapshots, compute_elasticity
from app.core.config import get_settings

settings = get_settings()


async def check_and_send_alerts(
    db: AsyncSession,
    product_id: int,
    competitor_name: str,
    competitor_price: float,
):
    result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product or not product.my_price:
        return

    user_result = await db.execute(select(User).where(User.id == product.owner_id))
    user = user_result.scalar_one_or_none()
    if not user:
        return

    threshold = user.alert_threshold_pct or 5.0
    delta_pct = ((product.my_price - competitor_price) / product.my_price) * 100

    if delta_pct < threshold:
        return  # no undercut

    # Compute a recommendation
    try:
        from app.models.product import PriceSnapshot
        snap_result = await db.execute(
            select(PriceSnapshot.price)
            .where(PriceSnapshot.product_id == product_id, PriceSnapshot.success == True)
            .order_by(PriceSnapshot.scraped_at.desc())
            .limit(50)
        )
        prices = [r[0] for r in snap_result.fetchall()]
        demand = build_demand_proxy_from_snapshots(prices)
        elasticity, _ = compute_elasticity(prices, demand) if len(prices) >= 5 else (-2.0, 0.0)
        rec_price = recommend_price(elasticity, product.my_price * 0.6, product.my_price)
    except Exception:
        rec_price = competitor_price * 0.99

    alert = Alert(
        user_id=user.id,
        product_id=product_id,
        competitor_name=competitor_name,
        competitor_price=competitor_price,
        my_price=product.my_price,
        recommended_price=rec_price,
        delta_pct=delta_pct,
    )
    db.add(alert)
    await db.commit()

    if user.slack_webhook_url:
        await send_slack_alert(
            user.slack_webhook_url,
            product.name,
            competitor_name,
            competitor_price,
            product.my_price,
            rec_price,
        )


async def send_slack_alert(
    webhook_url: str,
    product_name: str,
    competitor_name: str,
    their_price: float,
    my_price: float,
    recommended: float,
):
    message = {
        "text": (
            f"*PriceSignal Alert* — {product_name}\n"
            f"*{competitor_name}* is selling at *${their_price:.2f}* "
            f"(your price: ${my_price:.2f})\n"
            f"Recommended response price: *${recommended:.2f}*"
        )
    }
    async with httpx.AsyncClient() as client:
        try:
            await client.post(webhook_url, json=message, timeout=5.0)
        except Exception:
            pass  # Don't let alert delivery failure break scraping
