CREATE TABLE recipe_water_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date      DATE NOT NULL,
    milliliters   INT NOT NULL DEFAULT 0,
    UNIQUE (user_id, log_date)
);

CREATE INDEX idx_recipe_water_logs_user ON recipe_water_logs (user_id, log_date);
