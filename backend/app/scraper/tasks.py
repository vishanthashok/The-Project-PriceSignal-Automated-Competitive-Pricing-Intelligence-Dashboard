import re
import asyncio
from celery import Task
from app.celery_app import celery_app
from app.core.config import get_settings

settings = get_settings()


def run_async(coro):
    """Run an async coroutine from a sync Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def scrape_competitor(self, competitor_id: int):
    """Scrape a single competitor URL and save the price snapshot."""
    try:
        return run_async(_scrape_competitor_async(competitor_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 30)


async def _scrape_competitor_async(competitor_id: int):
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.product import Competitor, PriceSnapshot
    from app.alerts.service import check_and_send_alerts

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Competitor).where(Competitor.id == competitor_id, Competitor.is_active == True)
        )
        competitor = result.scalar_one_or_none()
        if not competitor:
            return {"status": "skipped", "reason": "competitor not found or inactive"}

        price = None
        error_msg = None

        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.goto(competitor.url, timeout=15000)
                element = await page.query_selector(competitor.css_selector)
                if element:
                    price_text = await element.inner_text()
                    price = float(re.sub(r"[^\d.]", "", price_text))
                await browser.close()
        except Exception as e:
            error_msg = str(e)

        snapshot = PriceSnapshot(
            product_id=competitor.product_id,
            competitor_id=competitor_id,
            price=price or 0.0,
            source_url=competitor.url,
            success=price is not None,
            error_message=error_msg,
        )
        db.add(snapshot)
        await db.commit()

        if price is not None:
            await check_and_send_alerts(db, competitor.product_id, competitor.name, price)

        return {"status": "ok", "price": price, "competitor_id": competitor_id}


@celery_app.task
def scrape_all_active():
    """Dispatch scrape tasks for all active competitors."""
    return run_async(_scrape_all_async())


async def _scrape_all_async():
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.product import Competitor, Product

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Competitor)
            .join(Product, Competitor.product_id == Product.id)
            .where(Competitor.is_active == True, Product.is_active == True)
        )
        competitors = result.scalars().all()

    dispatched = 0
    for comp in competitors:
        scrape_competitor.delay(comp.id)
        dispatched += 1

    return {"dispatched": dispatched}
