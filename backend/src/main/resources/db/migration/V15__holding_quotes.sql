ALTER TABLE holdings
    ADD COLUMN ticker VARCHAR(40),
    ADD COLUMN exchange VARCHAR(16),
    ADD COLUMN quantity NUMERIC(18, 8) NOT NULL DEFAULT 0,
    ADD COLUMN avg_buy NUMERIC(18, 6) NOT NULL DEFAULT 0;

UPDATE holdings
SET ticker = name
WHERE ticker IS NULL AND name IS NOT NULL;

UPDATE holdings
SET kind = 'COMMODITY'
WHERE kind IN ('GOLD', 'SILVER');
