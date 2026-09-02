ALTER TABLE food_recipe_items
    ADD COLUMN unit VARCHAR(4) NOT NULL DEFAULT 'g';

ALTER TABLE meal_log_items
    ADD COLUMN unit VARCHAR(4) NOT NULL DEFAULT 'g';
