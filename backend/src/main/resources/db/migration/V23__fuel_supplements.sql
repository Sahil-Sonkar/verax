CREATE TABLE fuel_supplements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(160) NOT NULL,
    dose        VARCHAR(80),
    timing      VARCHAR(80),
    notes       VARCHAR(240),
    sort_order  INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_fuel_supplements_user ON fuel_supplements (user_id, sort_order);

CREATE TABLE fuel_supplement_logs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    supplement_id  UUID NOT NULL REFERENCES fuel_supplements(id) ON DELETE CASCADE,
    log_date       DATE NOT NULL,
    servings       INT NOT NULL DEFAULT 1,
    UNIQUE (supplement_id, log_date)
);

CREATE INDEX idx_fuel_supplement_logs_user ON fuel_supplement_logs (user_id, log_date);
