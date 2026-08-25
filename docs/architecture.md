# Verax Architecture

**Verax** is a personal operating system that answers:

> Am I consistently becoming the person I want to become?

Core loop: **Plan → Do → Track → Analyze → Improve**  
Primary metric: **consistency**, not productivity.

Branding lives in `verax.app-name` (backend) and `VITE_APP_NAME` (frontend).

## Phases

| Phase | Status |
| --- | --- |
| 1 Auth, dashboard, today, habits, heatmap, streaks | Shipped |
| 2 Goals, metrics, analytics, compare | Shipped |
| 3 Transformation, journal, photos, weekly review | Shipped |
| 4 AI coach, correlations, external APIs | Partial: metric ingest, focus timer, medicines. Live OAuth later |

## Layout

```
verax/
├── backend/                 Spring Boot 3.4, Java 21, PostgreSQL
├── frontend/                React 19, Vite, TypeScript, Tailwind
├── docker-compose.yml       Postgres, Redis, API, web
├── .github/workflows/ci.yml
└── docs/
```

## Consistency model

A day's score is the **weighted** completion of habits scheduled that day.

| Status    | Multiplier | Effect                                  |
|-----------|------------|-----------------------------------------|
| COMPLETED | 1.0        | Full weight                             |
| PARTIAL   | 0.5        | Half weight                             |
| MISSED    | 0.0        | Zero; still in the denominator          |
| SKIPPED   | —          | Excluded from numerator and denominator |

Weights: Critical = 3, Important = 2, Optional = 1.

```
dailyScore = Σ (weight × multiplier) / Σ (weight of non-skipped scheduled habits)
```

- Unlogged habits on a **past** day count as missed.
- Unlogged habits **today** count as pending (0) so the running score matches “7 / 10 = 70%”.
- Future days have no score.
- A single miss cannot collapse a streak: a day counts toward a streak at **≥ 50%**.
- Period scores (week / month / rolling 30) are the mean of daily scores in that window.

Weekly habits (e.g. boxing 3×/week) enter a day's denominator only when they are due: remaining sessions ≥ remaining days in the period, or the user logs them that day.

## Domain separation

| Entity         | Meaning                                    |
|----------------|--------------------------------------------|
| Habit          | Recurring commitment (process)             |
| Goal           | Outcome with target / current / date       |
| Metric         | Numeric time series, independent of habits |
| Journal        | How the user was thinking that day         |
| Transformation | A bounded mission that groups goals        |
| Medication     | A course with scheduled doses              |
| Focus session  | Timed meditation or reading                |

Historical rows are never hard-deleted. Habits and goals are archived.

## API surface

All JSON under `/api`. Analytics endpoints return **aggregated** payloads; the client does not recompute scores.

- `POST /api/auth/register` `POST /api/auth/login`
- `GET|PATCH /api/me`
- Categories, habits, completions, day snapshot
- Goals + milestones
- Metrics + entries
- Journal
- Transformations
- `GET /api/analytics/dashboard|heatmap|trends|categories|habits|compare|weekly-review`
- `GET /api/quote` — ZenQuotes daily quote (cached 6h, local fallback)
- `GET /api/auth/providers` `POST /api/auth/google` `POST /api/auth/apple`
- Nested habits (`parentId`); parent folders are excluded from the score
- `GET|POST|PATCH|DELETE /api/finance/holdings` and `GET|PUT /api/finance/budget?month=YYYY-MM`

Habits may reference a metric and a threshold. Writing that metric auto-completes the habit (full at threshold, partial at half). Verax does not scrape Garmin, banks, Cult Fit, or Lyfta.

## AI coach (Phase 4, scaffolded)

`InsightService` is the only place that will later call an LLM. It already receives the user's historical aggregates. The UI can render insights without coupling to a model provider.
