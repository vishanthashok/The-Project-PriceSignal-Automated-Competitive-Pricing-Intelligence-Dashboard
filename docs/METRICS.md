# PriceSignal — Live Metrics

> Update this file with real numbers as the app runs. Even small, honest numbers
> beat empty sections. Recruiters notice the difference.

## System performance

| Metric | Value |
|---|---|
| Total price snapshots processed | _update me_ |
| Average scrape latency (p50) | _update me_ ms |
| Average scrape latency (p95) | _update me_ ms |
| Scrape success rate | _update me_ % |
| Uptime (last 30 days) | _update me_ % |

## Alert accuracy

| Metric | Value |
|---|---|
| Total alerts fired | _update me_ |
| Alerts that led to user repricing action | _update me_ |
| Alert-to-action conversion rate | _update me_ % |
| False positive rate (alert fired, no undercut) | _update me_ % |

## Elasticity model

| Metric | Value |
|---|---|
| Products with high-confidence recommendation | _update me_ |
| Mean elasticity coefficient across products | _update me_ |
| Mean R² of regression fits | _update me_ |

## How to pull these numbers

```bash
# Connect to your DB and run:
psql $DATABASE_URL -c "SELECT COUNT(*) FROM price_snapshots WHERE success = true;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM alerts;"
psql $DATABASE_URL -c "
  SELECT
    AVG(EXTRACT(EPOCH FROM (scraped_at - LAG(scraped_at) OVER (PARTITION BY product_id ORDER BY scraped_at)))) AS avg_interval_seconds
  FROM price_snapshots
  WHERE success = true;
"
```
