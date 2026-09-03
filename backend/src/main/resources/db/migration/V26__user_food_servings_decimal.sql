ALTER TABLE user_foods
    ALTER COLUMN servings TYPE NUMERIC(12, 2) USING servings::numeric;
