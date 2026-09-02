CREATE TABLE food_recipes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(160) NOT NULL,
    servings    NUMERIC(8, 2) NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_food_recipes_user ON food_recipes(user_id);

CREATE TABLE food_recipe_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id    UUID NOT NULL REFERENCES food_recipes(id) ON DELETE CASCADE,
    name         VARCHAR(200) NOT NULL,
    external_id  VARCHAR(64),
    source       VARCHAR(24),
    grams        NUMERIC(10, 2) NOT NULL,
    kcal         NUMERIC(10, 2) NOT NULL DEFAULT 0,
    protein      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    carbs        NUMERIC(10, 2) NOT NULL DEFAULT 0,
    fat          NUMERIC(10, 2) NOT NULL DEFAULT 0
);

CREATE TABLE meal_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date    DATE NOT NULL,
    slot        VARCHAR(16) NOT NULL,
    recipe_id   UUID REFERENCES food_recipes(id) ON DELETE SET NULL,
    name        VARCHAR(160) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_logs_user_date ON meal_logs(user_id, log_date);

CREATE TABLE meal_log_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id      UUID NOT NULL REFERENCES meal_logs(id) ON DELETE CASCADE,
    name         VARCHAR(200) NOT NULL,
    external_id  VARCHAR(64),
    source       VARCHAR(24),
    grams        NUMERIC(10, 2) NOT NULL,
    kcal         NUMERIC(10, 2) NOT NULL DEFAULT 0,
    protein      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    carbs        NUMERIC(10, 2) NOT NULL DEFAULT 0,
    fat          NUMERIC(10, 2) NOT NULL DEFAULT 0
);

CREATE TABLE routine_blocks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(120) NOT NULL,
    start_min   INT NOT NULL,
    end_min     INT NOT NULL,
    weekdays    VARCHAR(32) NOT NULL DEFAULT '1,2,3,4,5,6,7',
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_routine_blocks_user ON routine_blocks(user_id);

CREATE TABLE routine_tasks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id    UUID NOT NULL REFERENCES routine_blocks(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    weekdays    VARCHAR(32) NOT NULL DEFAULT '',
    sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE train_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    kind        VARCHAR(24) NOT NULL DEFAULT 'STRENGTH',
    sort_order  INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_train_templates_user ON train_templates(user_id);

CREATE TABLE train_template_exercises (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id  UUID NOT NULL REFERENCES train_templates(id) ON DELETE CASCADE,
    name         VARCHAR(160) NOT NULL,
    muscle       VARCHAR(32) NOT NULL DEFAULT 'OTHER',
    track        VARCHAR(16) NOT NULL DEFAULT 'REPS',
    sort_order   INT NOT NULL DEFAULT 0
);

CREATE TABLE train_sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id  UUID REFERENCES train_templates(id) ON DELETE SET NULL,
    name         VARCHAR(160) NOT NULL,
    kind         VARCHAR(24) NOT NULL DEFAULT 'STRENGTH',
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at     TIMESTAMPTZ,
    source       VARCHAR(24) NOT NULL DEFAULT 'MANUAL'
);

CREATE INDEX idx_train_sessions_user ON train_sessions(user_id, started_at);

CREATE TABLE train_sets (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id     UUID NOT NULL REFERENCES train_sessions(id) ON DELETE CASCADE,
    exercise_name  VARCHAR(160) NOT NULL,
    muscle         VARCHAR(32) NOT NULL DEFAULT 'OTHER',
    track          VARCHAR(16) NOT NULL DEFAULT 'REPS',
    set_index      INT NOT NULL DEFAULT 1,
    reps           INT,
    kg             NUMERIC(8, 2),
    seconds        INT
);

CREATE TABLE train_activities (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name           VARCHAR(160) NOT NULL,
    activity_type  VARCHAR(40) NOT NULL,
    activity_date  DATE NOT NULL,
    duration_sec   INT,
    distance_m     INT,
    calories       INT,
    avg_hr         INT,
    notes          TEXT,
    source         VARCHAR(24) NOT NULL DEFAULT 'GARMIN',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_train_activities_user ON train_activities(user_id, activity_date);

CREATE TABLE sleep_nights (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    night_date  DATE NOT NULL,
    start_time  VARCHAR(8),
    end_time    VARCHAR(8),
    score       INT,
    awake_min   INT NOT NULL DEFAULT 0,
    rem_min     INT NOT NULL DEFAULT 0,
    core_min    INT NOT NULL DEFAULT 0,
    deep_min    INT NOT NULL DEFAULT 0,
    source      VARCHAR(24) NOT NULL DEFAULT 'MANUAL',
    UNIQUE (user_id, night_date)
);

CREATE TABLE finance_accounts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(160) NOT NULL,
    kind        VARCHAR(24) NOT NULL DEFAULT 'BANK',
    balance     NUMERIC(14, 2) NOT NULL DEFAULT 0,
    currency    VARCHAR(8) NOT NULL DEFAULT 'INR'
);

CREATE INDEX idx_finance_accounts_user ON finance_accounts(user_id);

CREATE TABLE finance_loans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(160) NOT NULL,
    kind        VARCHAR(24) NOT NULL DEFAULT 'PERSONAL',
    principal   NUMERIC(14, 2) NOT NULL DEFAULT 0,
    remaining   NUMERIC(14, 2) NOT NULL DEFAULT 0,
    emi         NUMERIC(14, 2) NOT NULL DEFAULT 0,
    rate        NUMERIC(6, 2)
);

CREATE INDEX idx_finance_loans_user ON finance_loans(user_id);

CREATE TABLE finance_tax_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tax_year    INT NOT NULL,
    name        VARCHAR(160) NOT NULL,
    kind        VARCHAR(32) NOT NULL DEFAULT 'OTHER',
    amount      NUMERIC(14, 2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_finance_tax_user ON finance_tax_items(user_id, tax_year);
