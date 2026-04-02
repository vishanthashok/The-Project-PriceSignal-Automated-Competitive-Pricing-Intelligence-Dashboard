# PriceSignal

**Automated competitive pricing intelligence for e-commerce.**

PriceSignal scrapes competitor prices on a configurable schedule, runs an economic price-elasticity model to recommend your optimal price, and surfaces everything through a live dashboard with Slack alerts — no data team required.

![License](https://img.shields.io/badge/license-MIT-green)
![Python](https://img.shields.io/badge/python-3.11-blue)
![React](https://img.shields.io/badge/react-18-61dafb)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen)

---

## Why this exists

Competitive repricing tools (Prisync, Wiser, Competera) cost $300–$2,000/month and are built for enterprise teams. PriceSignal is the open-source, self-hostable alternative — deployable in under 10 minutes with `docker compose up`.

---

## Features

| Feature | Details |
|---|---|
| **Automated scraping** | Playwright + Celery; configurable hourly/daily/weekly cadence |
| **Elasticity model** | Log-log OLS regression → revenue-maximising price recommendation |
| **Live dashboard** | Overview, Trends (Recharts), Recommendations, Alerts (React + TypeScript) |
| **Slack alerts** | Webhook notification the moment a competitor undercuts your price |
| **Multi-tenancy** | JWT auth; each user sees only their own watchlists |
| **CSV export** | Any view exportable via Pandas; stored on S3 |
| **CI/CD** | GitHub Actions → ECR → EC2 on every merge to `main` |

---

## Tech stack

**Backend** — Python 3.11, FastAPI, SQLAlchemy (async), Alembic, Celery, Redis, Playwright, scikit-learn, Pandas

**Frontend** — React 18, TypeScript, Recharts, TanStack Query, React Router, Tailwind CSS

**Database** — PostgreSQL 15 + TimescaleDB (time-series hypertable for `price_snapshots`)

**Infrastructure** — Docker, AWS EC2 + RDS + ElastiCache + S3 + ECR, GitHub Actions

---

## Quick start (local)

**Prerequisites:** Docker Desktop installed and running.

```bash
git clone https://github.com/vishanthashok/The-Project-PriceSignal-Automated-Competitive-Pricing-Intelligence-Dashboard.git
cd The-Project-PriceSignal-Automated-Competitive-Pricing-Intelligence-Dashboard

cp .env.example .env
# Optionally add your SLACK_WEBHOOK_URL

docker compose up
```

- API + Swagger docs: http://localhost:8000/docs
- Frontend dashboard: http://localhost:3000

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Data layer                        │
│  Playwright scraper  →  TimescaleDB  ←  SerpAPI          │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                       Backend                            │
│  FastAPI  ←→  Celery/Redis  ←→  Elasticity engine        │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                      Frontend                            │
│  React dashboard  (Overview / Trends / Recs / Alerts)    │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                   Notifications                          │
│  Slack webhook  ·  SendGrid email  ·  In-app badge       │
└─────────────────────────────────────────────────────────┘
```

---

## Running tests

```bash
cd backend
pip install -r requirements.txt
pytest --cov=app --cov-report=term-missing -v
```

The test suite covers: pricing engine edge cases, auth token expiry, CRUD endpoints, alert trigger logic, and scrape retry behaviour (30+ tests, ≥80% coverage).

---

## AWS deployment

Full step-by-step instructions in [`docs/DEPLOY.md`](docs/DEPLOY.md). TL;DR:

1. Create RDS Postgres (db.t3.micro), enable TimescaleDB extension.
2. Create ElastiCache Redis (cache.t3.micro).
3. Launch EC2 t2.micro, install Docker, pull image from ECR.
4. Add GitHub Actions secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `EC2_HOST`, `EC2_SSH_KEY`, `ECR_REGISTRY`.
5. Push to `main` — CI/CD handles the rest.

---

## Elasticity model

For each product, PriceSignal runs a **log-log OLS regression** over historical price vs. demand proxy (search rank inversion or, with Shopify integration, real sales velocity):

```
log(Q) = α + ε · log(P) + u
```

Where `ε` is the price elasticity of demand. The revenue-maximising price follows the **Lerner markup formula**:

```
P* = ε / (ε + 1) × MC
```

Subject to a user-configurable margin floor. See [`/notebooks/elasticity_model.ipynb`](notebooks/elasticity_model.ipynb) for a full derivation and worked examples.

---

## Project structure

```
pricesignal/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers (auth, products, alerts)
│   │   ├── core/         # Config, database, JWT security
│   │   ├── models/       # SQLAlchemy ORM (User, Product, Competitor, Alert)
│   │   ├── schemas/      # Pydantic I/O schemas
│   │   ├── pricing/      # Elasticity engine + recommendation logic
│   │   ├── scraper/      # Celery tasks + Playwright scraping
│   │   └── alerts/       # Slack webhook service
│   └── tests/            # 30+ pytest tests
├── frontend/
│   └── src/
│       ├── api/           # Axios client + typed endpoints
│       ├── components/    # Sidebar layout
│       ├── hooks/         # Auth context (JWT)
│       ├── pages/         # Overview, Trends, Recommendations, Alerts, AddProduct
│       └── types/         # TypeScript interfaces
├── docs/
│   └── METRICS.md         # Live system metrics (update as you run it)
├── notebooks/
│   └── elasticity_model.ipynb
├── .github/workflows/
│   └── deploy.yml         # Test → build → push ECR → SSH deploy
├── docker-compose.yml
└── .env.example
```

---

## Optional enhancements

- **Shopify OAuth** — use real sales velocity as the demand proxy
- **Chrome extension** — click any price on the web to add it to your watchlist
- **LLM weekly digest** — GPT-4 summarises "what changed this week and why"
- **Public API + Stripe** — rate-limited tiers at $29/month Pro

---

## License

MIT © 2024 — see [LICENSE](LICENSE)
