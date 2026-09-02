ALTER TABLE train_template_exercises
    ADD COLUMN planned_sets JSONB NOT NULL DEFAULT '[{"reps":8},{"reps":8},{"reps":8}]';
