ALTER TABLE food_recipe_items
    ADD COLUMN micros JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE meal_log_items
    ADD COLUMN micros JSONB NOT NULL DEFAULT '{}'::jsonb;
