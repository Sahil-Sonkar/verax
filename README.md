# Verax

A personal operating system for long-term consistency.

Verax answers one question:

> Am I consistently becoming the person I want to become?

It is not a generic habit tracker. The primary metric is **consistency** across body, career, finance, craft, appearance, health, and growth.

Core loop: **Plan → Do → Track → Analyze → Improve**

## What you can do today

Sign up (or use the demo account), keep a weighted habit stack, check in on Today, and see whether the stretch is compounding.

| Area | In the app |
| --- | --- |
| **Auth** | Email and password, plus Google and Apple when `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` are set. JWT, 7-day expiry. |
| **Dashboard** (`/`) | Motivational quote (ZenQuotes, with local fallback), 30-day consistency, streaks, D3 radar nested in a circular barplot of categories, heatmap, weekly review, heuristic insights. |
| **Today** (`/today`) | Tabs for daily / weekly / monthly. Nested stacks (supplements as subtasks). Water slider for 3L. Medicines. Meditation and reading timer. |
| **Habits** (`/habits`) | Create, edit, archive, nest under a parent. Daily, a specific weekday, weekly, or monthly. Optional auto-complete from a metric. |
| **Invest** (`/invest`) | Holdings ledger and this month’s budget (income, planned invest, spend lines). The Invest habit is monthly, not daily. |
| **Goals** (`/goals`) | Outcome with current / target / date. Archive. Milestones exist in the API and seed data; there is no milestone editor in the UI. |
| **Analytics** (`/analytics`) | Consistency trend (day/week/month/year), category and habit bars, period compare, weekly review. |
| **Transformation** (`/transformation`) | A bounded mission with linked goals, days elapsed, and consistency. The UI shows the first period. Create via API. |
| **Journal** (`/journal`) | One entry per day: mood, note, wins, problems, lessons, reflection. |
| **Medicines** (`/meds`) | Name, dosage, times, weekdays. Today lists doses (taken / skip / undo). Yesterday’s leftover pending doses become missed. On mobile, manage from Today. |
| **Settings** (`/settings`) | Dark/light, connected-app catalog, paste a reading, metrics, progress photos, reminder preferences (no delivery yet), sign out. |

Default categories on every new account: Body, Career, Content, Appearance, Learning, Personal, Finance, Health, Relationships, Other.

## Scoring

Habits are process. Goals are outcomes. Metrics are numbers. They stay separate.

| Completion | Weight in the day |
| --- | --- |
| Done | 1.0 × habit weight |
| Partial | 0.5 × habit weight |
| Missed | 0, still in the denominator |
| Skipped | Excluded |

Habit weights: Critical 3, Important 2, Optional 1.

- A day counts toward a streak at **≥ 50%**. One miss does not collapse the stretch.
- Unlogged **past** days count as missed. Unlogged **today** stays pending, so 7/10 reads as 70%.
- Weekly habits (for example boxing 3×/week) only enter a day’s denominator when they are due, or when you log them that day.
- A parent habit with children (the supplements stack) is a folder. Only the children count toward the score.
- Habits, goals, and medicines are archived, never hard-deleted.

Scoring formula and API map: [docs/architecture.md](docs/architecture.md).

## Look

Each page has a twilight wash at the sides (violet, sky, gold). Categories keep a candy palette for data. **Liquid Glass** is reserved for chrome that floats above content: the sidebar, mobile tab bar, sheets, segmented controls, and primary actions. It uses lensing (specular rim, inner occlusion, concentrated highlight) rather than a frost overlay on every control. Cards and fields stay in the content layer. Tinted glass is only for the primary action. The wordmark is a gold → sky → violet gradient.

## Less tapping: metrics, timer, ingest

Opening Verax every day and tapping every habit is the fallback. A habit can auto-complete when a linked metric crosses a threshold (full at the threshold, partial at half). Link that on the Habits page.

| Source | Status |
| --- | --- |
| Google Fit / Health, Fitbit | Not live. Google Fit REST is shutting down. Paste steps or sleep hours in Settings → Connected apps. |
| Garmin | Partner-only API. Export sleep hours and paste them. |
| Zerodha | Official Kite Connect exists, but you register your own app. Verax will not take your password. Log invested capital until keys exist. |
| Banks | Do not scrape net banking. Legal path in India is RBI Account Aggregator. Log net worth as a metric. |
| Lyfta, Cult Fit | No public API. Log workout minutes after you train. |
| Meditation / reading | Built in. Timer on Today writes “Meditation minutes” or “Reading minutes” and can mark a habit done. |
| Medicines | Built in. List courses under Medicines; Today shows doses. |

Verax does not scrape Garmin, banks, Cult Fit, or Lyfta, and does not store those passwords.

## What is not built yet

- Live Google Health OAuth, Garmin partner access, Kite Connect keys, Account Aggregator
- Correlation engine
- Real LLM coach (`InsightService` is heuristic copy on `/api/insights/preview`; dashboard already renders it)
- Google / Apple login until you set `GOOGLE_CLIENT_ID` and `APPLE_CLIENT_ID` (buttons are on the login page; they explain what is missing)
- Push / email / SMS delivery (preferences are stored)
- Goal-milestone editor, category manager, transformation creator in the UI
- Side-by-side photo compare, journal photos
- Profile PATCH (`GET /api/me` is used; timezone defaults to `Asia/Kolkata` at register)
- Redis (Compose starts a Redis container; the API does not use it)

## Stack

| Layer | Choice |
| --- | --- |
| Web | React 19, TypeScript, Vite 8, Tailwind v4, React Router 7, TanStack Query, Recharts, lucide-react |
| API | Java 21, Spring Boot 3.4, Spring Security JWT, JPA, Flyway |
| Database | PostgreSQL 16 |
| Auth | Email / password + JWT. Google and Apple ID-token verify when client IDs are set |
| Photos | Local disk (`VERAX_UPLOAD_DIR`, default `backend/uploads/`) |
| Infra | Docker Compose, GitHub Actions (Java 21 tests, Node 22 frontend build) |

Schema lives in `backend/src/main/resources/db/migration/` (`V1` init, `V2` category colors, `V3` habit auto-complete, medicines, focus sessions, `V4` OAuth columns, nested habits, holdings and monthly budget).

## Run locally

Needs **Java 21**, **Maven**, **Node 22**, and **PostgreSQL 16**.

```bash
createdb verax
```

If your Postgres user is not your OS username, copy `.env.example` and export `DATABASE_USER` / `DATABASE_PASSWORD`. Unset `DATABASE_USER` defaults to `$USER`. Password defaults to empty.

API (port **8081**, so it does not collide with other local apps on 8080):

```bash
cd backend
mvn spring-boot:run
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

Optional environment (see `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8081` | API port |
| `DATABASE_URL` | `jdbc:postgresql://localhost:5432/verax` | Postgres |
| `DATABASE_USER` | `$USER` | Postgres user |
| `DATABASE_PASSWORD` | empty | Postgres password |
| `VERAX_JWT_SECRET` | dev placeholder | Sign tokens; change in production |
| `VERAX_SEED` | `true` | Seed demo user when the user table is empty |
| `VERAX_UPLOAD_DIR` | `./uploads` | Progress photos |
| `GOOGLE_CLIENT_ID` | empty | Enables Continue with Google. Must match the Web client ID that issues the ID token. |
| `APPLE_CLIENT_ID` | empty | Enables Continue with Apple (Services ID). Domain and redirect must be registered with Apple. |

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

### Tests

```bash
cd backend && mvn test
cd frontend && npm run build
```

Backend coverage today: consistency scoring, habit scheduler, metric auto-complete thresholds. Frontend CI is a production build (`tsc` + Vite).

## Layout

```
backend/     Spring Boot API (package com.verax)
frontend/    Verax web app
docs/        Architecture and scoring
.github/     CI
```

The wordmark is **Verax** in the UI. Backend config key: `verax.app-name`.
