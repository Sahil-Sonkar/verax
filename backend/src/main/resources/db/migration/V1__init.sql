CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(120) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    timezone        VARCHAR(64)  NOT NULL DEFAULT 'Asia/Kolkata',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(80) NOT NULL,
    slug            VARCHAR(80) NOT NULL,
    color           VARCHAR(16),
    icon            VARCHAR(64),
    sort_order      INT NOT NULL DEFAULT 0,
    system_key      VARCHAR(40),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, slug)
);

CREATE INDEX idx_categories_user ON categories(user_id);

CREATE TABLE habits (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
    name                VARCHAR(160) NOT NULL,
    description         TEXT,
    icon                VARCHAR(64),
    section             VARCHAR(32) NOT NULL DEFAULT 'GROWTH',
    frequency_type      VARCHAR(32) NOT NULL,
    frequency_config    JSONB NOT NULL DEFAULT '{}'::jsonb,
    target_value        NUMERIC(12, 2),
    unit                VARCHAR(40),
    importance          VARCHAR(16) NOT NULL DEFAULT 'IMPORTANT',
    weight              INT NOT NULL DEFAULT 2,
    start_date          DATE NOT NULL,
    end_date            DATE,
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    archived_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_habits_user_active ON habits(user_id, active);

CREATE TABLE habit_completions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    habit_id        UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    status          VARCHAR(16) NOT NULL,
    value           NUMERIC(12, 2),
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (habit_id, date)
);

CREATE INDEX idx_completions_user_date ON habit_completions(user_id, date);
CREATE INDEX idx_completions_habit_date ON habit_completions(habit_id, date);

CREATE TABLE day_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    note            TEXT,
    UNIQUE (user_id, date)
);

CREATE TABLE goals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    name            VARCHAR(160) NOT NULL,
    description     TEXT,
    target_value    NUMERIC(14, 2),
    current_value   NUMERIC(14, 2) NOT NULL DEFAULT 0,
    baseline_value  NUMERIC(14, 2),
    unit            VARCHAR(40),
    start_date      DATE,
    target_date     DATE,
    status          VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    notes           TEXT,
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goals_user ON goals(user_id, status);

CREATE TABLE goal_milestones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id         UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    name            VARCHAR(160) NOT NULL,
    target_value    NUMERIC(14, 2),
    reached_at      DATE,
    notes           TEXT,
    sort_order      INT NOT NULL DEFAULT 0
);

CREATE TABLE metrics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    name            VARCHAR(160) NOT NULL,
    unit            VARCHAR(40),
    description     TEXT,
    source          VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_metrics_user ON metrics(user_id);

CREATE TABLE metric_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_id       UUID NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    value           NUMERIC(16, 4) NOT NULL,
    note            TEXT,
    UNIQUE (metric_id, date)
);

CREATE INDEX idx_metric_entries_metric_date ON metric_entries(metric_id, date);

CREATE TABLE journal_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    content         TEXT,
    mood            VARCHAR(32),
    reflection      TEXT,
    wins            TEXT,
    problems        TEXT,
    lessons         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, date)
);

CREATE TABLE transformation_periods (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(160) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transformation_goals (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transformation_id   UUID NOT NULL REFERENCES transformation_periods(id) ON DELETE CASCADE,
    goal_id             UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    UNIQUE (transformation_id, goal_id)
);

CREATE TABLE assets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind                VARCHAR(32) NOT NULL,
    category            VARCHAR(32),
    original_filename   VARCHAR(255),
    content_type        VARCHAR(127),
    storage_key         VARCHAR(512) NOT NULL,
    taken_at            DATE,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_user_kind ON assets(user_id, kind);

CREATE TABLE notification_preferences (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    morning_reminder    BOOLEAN NOT NULL DEFAULT TRUE,
    evening_checkin     BOOLEAN NOT NULL DEFAULT TRUE,
    missed_habit        BOOLEAN NOT NULL DEFAULT FALSE,
    weekly_review       BOOLEAN NOT NULL DEFAULT TRUE,
    goal_milestone      BOOLEAN NOT NULL DEFAULT TRUE,
    streak_milestone    BOOLEAN NOT NULL DEFAULT TRUE,
    morning_time        TIME NOT NULL DEFAULT '07:30',
    evening_time        TIME NOT NULL DEFAULT '21:00'
);
