# Contributing to PriceSignal

Thank you for your interest! Here's how to get started.

## Local development setup

```bash
git clone https://github.com/YOUR_USERNAME/pricesignal.git
cd pricesignal
cp .env.example .env          # fill in your values
docker compose up             # starts app, worker, beat, db, redis
```

The API will be available at `http://localhost:8000/docs` (Swagger UI).
The frontend at `http://localhost:3000`.

## Running tests

```bash
cd backend
pip install -r requirements.txt
pytest --cov=app -v
```

## Code style

- Python: follow PEP 8; use `black` for formatting, `ruff` for linting.
- TypeScript: run `tsc --noEmit` before committing.
- Commits: use [Conventional Commits](https://www.conventionalcommits.org/).

## Pull request checklist

- [ ] Tests pass (`pytest`)
- [ ] New features have tests
- [ ] `METRICS.md` updated if you changed scraping or alerting logic
- [ ] No secrets committed (check `.env.example` is the only env file)

## Project structure

```
pricesignal/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI route handlers
│   │   ├── core/         # Config, DB, security
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── pricing/      # Elasticity model & recommendation engine
│   │   ├── scraper/      # Celery tasks + Playwright scraping
│   │   └── alerts/       # Slack/email alert service
│   └── tests/
├── frontend/
│   └── src/
│       ├── api/          # Axios client
│       ├── components/   # Layout, shared UI
│       ├── hooks/        # Auth context
│       ├── pages/        # Overview, Trends, Recommendations, Alerts
│       └── types/        # TypeScript interfaces
├── docs/
│   └── METRICS.md
└── .github/workflows/    # CI/CD
```
