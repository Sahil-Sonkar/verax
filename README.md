# Verax

A personal operating system for one life, built as **separate rooms in one app**.

> Am I consistently becoming the person I want to become?

The primary metric is **consistency**, not productivity. Core loop: **Plan → Do → Track → Analyze → Improve**.

Do not optimize one day. Build a life that can run for years. The Voice rule: **do not build a content life. Build a great life and document it.**

## Rooms

| Room | Route | What it is |
|---|---|---|
| **Routine** | `/routine` | Minimal week clock. Seven days. Sectograph. Time blocks. Subtasks can be weekday-scoped. |
| **Body** | `/body` | Meals, recipes, supplements, water, macros. `/fuel` and `/recipe` redirect here. |
| **Play** | `/play` | Lift routines with a timer, volume and recovery, Garmin-shaped activities. `/train` redirects here. |
| **Money** | `/money` | Invest, budget workbook, accounts, loans, portfolio, tax. `/finance` and `/invest` redirect here. |
| **Mind** | `/mind` | Meditation timer, ambients, sleep stages and score. |
| **Voice** | `/voice` | Social stats and content idea tracks. |

## Run locally

Needs **Java 21**, **Maven**, **Node 22**, and **PostgreSQL 16**.

```bash
createdb verax
cd backend && PORT=8081 mvn spring-boot:run
cd frontend && npm install && npm run dev
```

| | |
|---|---|
| App | [http://localhost:5173](http://localhost:5173) |
| API | [http://localhost:8081](http://localhost:8081) |
| Demo | `demo@verax.app` / `verax-demo` |

Vite proxies `/api` to the API. Env vars, Docker, and tests: [docs/product.md](docs/product.md#48-run-locally).

## Production

Web on [Vercel](https://vercel.com). API + Postgres on [Fly.io](https://fly.io) (`verax-sonkar-api`). Push `main` to ship the PWA. iPhone: Safari → Share → **Add to Home Screen**.

First-time Fly / Vercel and restore: [docs/product.md](docs/product.md#49-deploy).

## Docs

| | |
|---|---|
| Life model, week, inventories | [docs/life.md](docs/life.md) |
| Today clock spec | [docs/today.md](docs/today.md) |
| Scoring and API | [docs/architecture.md](docs/architecture.md) |
| App status, ingest, run, deploy | [docs/product.md](docs/product.md) |
