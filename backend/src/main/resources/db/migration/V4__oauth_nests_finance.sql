ALTER TABLE habits
    ADD COLUMN parent_id UUID REFERENCES habits(id) ON DELETE CASCADE;

CREATE INDEX idx_habits_parent ON habits(parent_id);

ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users
    ADD COLUMN auth_provider VARCHAR(24) NOT NULL DEFAULT 'LOCAL',
    ADD COLUMN provider_subject VARCHAR(191);

CREATE UNIQUE INDEX idx_users_provider ON users(auth_provider, provider_subject)
    WHERE provider_subject IS NOT NULL;

CREATE TABLE holdings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(160) NOT NULL,
    kind        VARCHAR(32) NOT NULL DEFAULT 'OTHER',
    amount      NUMERIC(14, 2) NOT NULL DEFAULT 0,
    currency    VARCHAR(8) NOT NULL DEFAULT 'INR',
    notes       TEXT,
    as_of       DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_holdings_user ON holdings(user_id);

CREATE TABLE monthly_budgets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year_month      VARCHAR(7) NOT NULL,
    income          NUMERIC(14, 2) NOT NULL DEFAULT 0,
    planned_invest  NUMERIC(14, 2) NOT NULL DEFAULT 0,
    notes           TEXT,
    UNIQUE (user_id, year_month)
);

CREATE TABLE budget_lines (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id   UUID NOT NULL REFERENCES monthly_budgets(id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    planned     NUMERIC(14, 2) NOT NULL DEFAULT 0,
    spent       NUMERIC(14, 2) NOT NULL DEFAULT 0,
    sort_order  INT NOT NULL DEFAULT 0
);
