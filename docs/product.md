# Product

What the app does today, how to run it, and how to deploy it. Life inventory: [life.md](life.md). Scoring and API: [architecture.md](architecture.md).

## 4.1 This life vs the running app

| This life | In the app now |
|---|---|
| Water > 3 L | Today water slider |
| Supplements | Nested habit stack |
| Meditation / reading | Focus timer on Today |
| Journal 3 questions | Journal page (fields are wider than the 3 questions) |
| Invest + budget | `/invest` workbook + holdings |
| Medicines | `/meds` + Today doses |
| Sleep / training / steps | Habits + optional pasted metrics |
| Weekday training sheets | Not in the app (one “Exercise” / “Boxing” habit) |
| Clock-based Today | `/today` follows the weekday clock (Now / Up next / Later). Thursday 06:20 is Voice plan, not training. |
| Place Saturday block | Not in the app |
| Call home | Not in the app |
| Voice calendar + content bank | Not in the app |
| 1st-of-month invest allocation + password checklist | Partial (invest habit + workbook; no allocation UI, no hygiene list) |
| 8-aspect sidebar | Parked. App nav is Home + Routine, Fuel, Train, Finance, Mind, Profile |

## 4.2 What you can do in the app today

| Area | In the app |
|---|---|
| **Auth** | Email and password, plus Google and Apple when client IDs are set. JWT, 7-day expiry. |
| **Home** (`/`) | Five room cards. Cross-room analytics next. |
| **Routine** (`/routine`) | Week as 7 days. Sectograph + time list. Add / edit / remove blocks. Subtasks with weekday chips. |
| **Body** (`/body`) | Food search (USDA / Open Food Facts), recipes, meal slots, supplements for the day, water, daily macros, stacked + line charts. |
| **Play** (`/play`) | Seeded push/pull/leg + cardio templates. Session timer. Sets. Radar, volume, recovery. Garmin-shaped activity log. |
| **Money** (`/money`) | Invest, Budget workbook, Accounts, Loans, Portfolio, Tax compare. `/finance` and `/invest` redirect here. |
| **Mind** (`/mind`) | Sit timer, ambient noise, sleep stages and score. |
| **Voice** (`/voice`) | YouTube / Instagram / LinkedIn stats import. Content idea tracks. |
| **Dashboard** (`/consistency`) | Quote, 30-day consistency, streaks, D3 radar, heatmap, weekly review (legacy). |
| **Today** (`/today`) | Legacy weekday clock. Unlinked from nav. |
| **Habits** (`/habits`) | Create, edit, archive, nest. Daily, weekday, weekly, or monthly. Optional metric auto-complete. |
| **Goals** (`/goals`) | Outcome with current / target / date. Archive. Milestones in API only. |
| **Analytics** (`/analytics`) | Trends, category / habit bars, compare, weekly review. |
| **Transformation** (`/transformation`) | Bounded mission. UI shows the first period. |
| **Journal** (`/journal`) | One entry per day. |
| **Medicines** (`/meds`) | Courses, times, weekdays. Today lists doses. |
| **Settings** (`/settings`) | Theme, connected-app catalog, paste a reading, metrics, photos, reminder prefs (no delivery), sign out. |

## 4.3 Scoring

Habits are process. Goals are outcomes. Metrics are numbers. They stay separate.

| Completion | Weight in the day |
|---|---|
| Done | 1.0 × habit weight |
| Partial | 0.5 × habit weight |
| Missed | 0, still in the denominator |
| Skipped | Excluded |

Habit weights: Critical 3, Important 2, Optional 1.

- A day counts toward a streak at **≥ 50%**. One miss does not collapse the stretch
- Unlogged **past** days count as missed. Unlogged **today** stays pending, so 7/10 reads as 70%
- Weekly habits (for example boxing 3× / week) only enter a day’s denominator when they are due, or when you log them that day
- A parent habit with children (the supplements stack) is a folder. Only the children count toward the score
- Habits, goals, and medicines are archived, never hard-deleted

Scoring formula and API map: [docs/architecture.md](docs/architecture.md).

## 4.4 Look

Chrome follows Instagram: white (or true black) surfaces, a script wordmark, a left rail on desktop, and a 5-icon tab bar on the phone. Primary actions use Instagram blue. Categories on the dashboard are snack chips in the Instagram palette (orange, magenta, gold, purple, blue). **Liquid Glass is gone.** Full-width main on desktop (no 630px feed cap).

Wordmark: **Verax**. Backend config key: `verax.app-name`.

## 4.5 Ingest

Opening Verax every day and tapping every habit is the fallback. A habit can auto-complete when a linked metric crosses a threshold (full at the threshold, partial at half). Link that on the Habits page.

| Source | Status |
|---|---|
| Google Fit / Health, Fitbit | Not live. Google Fit REST is shutting down. Paste steps or sleep hours in Settings → Connected apps. |
| Garmin | Partner-only API. Export sleep hours and paste them. |
| Zerodha | Official Kite Connect exists, but you register your own app. Verax will not take your password. Log invested capital until keys exist. |
| Banks | Do not scrape net banking. Legal path in India is RBI Account Aggregator. Log net worth as a metric. Until Verax is an FIU, log net worth as a metric. |
| Lyfta, Cult Fit | No public API. Log workout minutes after you train. |
| Meditation / reading | Built in. Timer on Today writes “Meditation minutes” or “Reading minutes” and can mark a habit done. |
| Medicines | Built in. List courses under Medicines; Today shows doses. |

Verax does not scrape Garmin, banks, Cult Fit, or Lyfta, and does not store those passwords.

## 4.6 What is not built yet

- Live Google Health OAuth, Garmin partner access, Kite Connect keys, Account Aggregator
- Correlation engine
- Real LLM coach (`InsightService` is heuristic copy on `/api/insights/preview`; dashboard already renders it)
- Google / Apple login until you set `GOOGLE_CLIENT_ID` and `APPLE_CLIENT_ID` (buttons are on the login page; they explain what is missing)
- Push / email / SMS delivery (preferences are stored)
- Goal-milestone editor, category manager, transformation creator in the UI
- Side-by-side photo compare, journal photos
- Profile PATCH (`GET /api/me` is used; timezone defaults to `Asia/Kolkata` at register)
- Redis (Compose starts a Redis container; the API does not use it)
- Eight-aspect sidebar, clock-based Today, weekday training sheets, Place Saturday block, Voice calendar, 1st-of-month allocation UI

## 4.7 Stack

| Layer | Choice |
|---|---|
| Web | React 19, TypeScript, Vite 8, Tailwind v4, React Router 7, TanStack Query, shadcn/ui, morphicons, Geist, Recharts (mono charts), lucide |
| API | Java 21, Spring Boot 3.4, Spring Security JWT, JPA, Flyway |
| Database | PostgreSQL 16 |
| Auth | Email / password + JWT. Google and Apple ID-token verify when client IDs are set |
| Photos | Local disk (`VERAX_UPLOAD_DIR`, default `backend/uploads/`) |
| Infra | Docker Compose, GitHub Actions (Java 21 tests, Node 22 frontend build) |

Schema lives in `backend/src/main/resources/db/migration/` (`V1` init, `V2`–`V6` category colors, `V3` habit auto-complete, medicines, focus sessions, `V4` OAuth columns, nested habits, holdings and monthly budget, `V7` budget workbook, `V8` recipe / routine / train / sleep / finance books).

## 4.8 Run locally

Needs **Java 21**, **Maven**, **Node 22**, and **PostgreSQL 16**.

```bash
createdb verax
```

If your Postgres user is not your OS username, copy `.env.example` and export `DATABASE_USER` / `DATABASE_PASSWORD`. Unset `DATABASE_USER` defaults to `$USER`. Password defaults to empty.

API (port **8081**, so it does not collide with other local apps on 8080):

```bash
cd backend
PORT=8081 mvn spring-boot:run
```

API: [http://localhost:8081](http://localhost:8081) · health: [http://localhost:8081/actuator/health](http://localhost:8081/actuator/health)

Web:

```bash
cd frontend
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

Vite proxies `/api` to `http://127.0.0.1:8081`.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8081` | API port |
| `DATABASE_URL` | `jdbc:postgresql://localhost:5432/verax` | Postgres |
| `DATABASE_USER` | `$USER` | Postgres user |
| `DATABASE_PASSWORD` | empty | Postgres password |
| `VERAX_JWT_SECRET` | dev placeholder | Sign tokens; change in production |
| `VERAX_JWT_TTL` | `30d` | Session length (home-screen app) |
| `VERAX_CORS_ORIGINS` | empty | Extra allowed origins, comma-separated. `*.vercel.app` is always allowed |
| `VERAX_SEED` | `true` | Seed demo user when the user table is empty |
| `VERAX_UPLOAD_DIR` | `./uploads` | Progress photos |
| `GOOGLE_CLIENT_ID` | empty | Enables Continue with Google. Must match the Web client ID that issues the ID token. |
| `APPLE_CLIENT_ID` | empty | Enables Continue with Apple (Services ID). Domain and redirect must be registered with Apple. |
| `USDA_API_KEY` | `DEMO_KEY` | FoodData Central search. Get a free key if the demo key rate-limits. |
| `NINJAS_API_KEY` | empty | Optional. When set, Train uses [API Ninjas Exercises](https://api-ninjas.com/api/exercises). When empty, search falls back to the public [wger](https://wger.de) catalog (no key). |

### Demo account

On first boot with no users:

- Email: `demo@verax.app`
- Password: `verax-demo`
- Timezone: `Asia/Kolkata`
- Seeded habits, completions from 1 Jul 2026 through yesterday, goals, metrics, journal, and an 8-month transformation (Aug 2026–Apr 2027)

Seed only runs when there are no users. `VERAX_SEED=false` skips it.

### Docker

```bash
docker compose up --build
```

Maps the API to [http://localhost:8081](http://localhost:8081) and the web app to [http://localhost:5173](http://localhost:5173) (nginx, proxies `/api` to the API container). Compose also starts Redis; nothing reads it yet.

## 4.9 Deploy

The **website** is Vercel. The **API and your data** are Fly.io (Java 21 + Postgres). iPhone talks only to the Vercel origin; `vercel.json` rewrites `/api/*` to Fly.

### First time

```bash
# API + database (from backend/)
fly auth login
fly apps create verax-sonkar-api --org personal
fly postgres create --name verax-sonkar-db --region sin --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 1
fly postgres attach verax-sonkar-db -a verax-sonkar-api
fly secrets set VERAX_JWT_SECRET="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')" VERAX_SEED=false -a verax-sonkar-api
fly deploy -a verax-sonkar-api
```

Restore the local `demo@verax.app` database (never commit the dump):

```bash
pg_dump -h 127.0.0.1 -d verax -Fc --no-owner --no-acl -f /tmp/verax.dump
fly proxy 15432:5432 -a verax-sonkar-db
# other terminal:
pg_restore -h 127.0.0.1 -p 15432 --no-owner --no-acl --clean --if-exists -d verax /tmp/verax.dump
```

Then `vercel` from the repo root (project `verax`, production). Connect the GitHub repo so every push to `main` ships a new PWA. If the Fly hostname is not `verax-sonkar-api.fly.dev`, change the rewrite in `vercel.json`.

### iPhone

1. Open the Vercel URL in **Safari** (not Chrome).
2. Share → **Add to Home Screen**.
3. Log in as `demo@verax.app` / `verax-demo`.
4. After a code push, close the app from the app switcher and open it again so it can fetch the new build.

### Tests

```bash
cd backend && mvn test
cd frontend && npm run build
```

Backend coverage today: consistency scoring, habit scheduler, metric auto-complete thresholds. Frontend CI is a production build (`tsc` + Vite).

### Layout

```
backend/     Spring Boot API (package com.verax)
frontend/    Verax web app
docs/        Life model, Today spec, architecture, product
.github/     CI
```
