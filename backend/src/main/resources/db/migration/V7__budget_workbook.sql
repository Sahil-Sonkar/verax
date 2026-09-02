CREATE TABLE budget_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category    VARCHAR(80) NOT NULL DEFAULT '',
    name        VARCHAR(160) NOT NULL,
    kind        VARCHAR(24) NOT NULL DEFAULT 'EXPENSE',
    sort_order  INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_budget_items_user ON budget_items(user_id);

CREATE TABLE budget_amounts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id     UUID NOT NULL REFERENCES budget_items(id) ON DELETE CASCADE,
    year_month  VARCHAR(7) NOT NULL,
    amount      NUMERIC(14, 2),
    UNIQUE (item_id, year_month)
);
