CREATE TABLE user_foods (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    brand       VARCHAR(160),
    kcal        NUMERIC(12, 2) NOT NULL DEFAULT 0,
    protein     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    carbs       NUMERIC(12, 2) NOT NULL DEFAULT 0,
    fat         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    micros      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_foods_user_name ON user_foods (user_id, lower(name));
