ALTER TABLE body_logs
    ADD COLUMN kind VARCHAR(24) NOT NULL DEFAULT 'COMPOSITION';

UPDATE body_logs
SET kind = 'TAPE'
WHERE weight_kg IS NULL
  AND bmi IS NULL
  AND body_fat_pct IS NULL
  AND fat_free_kg IS NULL
  AND subcutaneous_fat_pct IS NULL
  AND visceral_fat IS NULL
  AND body_water_pct IS NULL
  AND skeletal_muscle_pct IS NULL
  AND muscle_mass_kg IS NULL
  AND muscle_storage IS NULL
  AND bone_mass_kg IS NULL
  AND protein_pct IS NULL
  AND bmr_kcal IS NULL
  AND metabolic_age IS NULL
  AND (
      waist_cm IS NOT NULL
      OR chest_cm IS NOT NULL
      OR left_bicep_cm IS NOT NULL
      OR right_bicep_cm IS NOT NULL
      OR hips_cm IS NOT NULL
      OR left_thigh_cm IS NOT NULL
      OR right_thigh_cm IS NOT NULL
      OR neck_cm IS NOT NULL
      OR shoulders_cm IS NOT NULL
      OR left_calf_cm IS NOT NULL
      OR right_calf_cm IS NOT NULL
      OR left_forearm_cm IS NOT NULL
      OR right_forearm_cm IS NOT NULL
  );

CREATE INDEX idx_body_logs_user_kind ON body_logs (user_id, kind, log_date DESC);
