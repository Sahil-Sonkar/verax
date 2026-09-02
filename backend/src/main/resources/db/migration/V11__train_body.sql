ALTER TABLE train_sessions
    ADD COLUMN photo_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;

CREATE TABLE body_profiles (
    user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    height_cm   NUMERIC(6, 2),
    sex         VARCHAR(16),
    birth_year  INT,
    activity    VARCHAR(24) NOT NULL DEFAULT 'MODERATE',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE body_logs (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date               DATE NOT NULL,
    source                 VARCHAR(24) NOT NULL DEFAULT 'MANUAL',
    weight_kg              NUMERIC(6, 2),
    height_cm              NUMERIC(6, 2),
    bmi                    NUMERIC(6, 2),
    body_fat_pct           NUMERIC(6, 2),
    fat_free_kg            NUMERIC(6, 2),
    subcutaneous_fat_pct   NUMERIC(6, 2),
    visceral_fat           NUMERIC(6, 2),
    body_water_pct         NUMERIC(6, 2),
    skeletal_muscle_pct    NUMERIC(6, 2),
    muscle_mass_kg         NUMERIC(6, 2),
    muscle_storage         NUMERIC(6, 2),
    bone_mass_kg           NUMERIC(6, 2),
    protein_pct            NUMERIC(6, 2),
    bmr_kcal               NUMERIC(8, 1),
    metabolic_age          INT,
    waist_cm               NUMERIC(6, 2),
    chest_cm               NUMERIC(6, 2),
    left_bicep_cm          NUMERIC(6, 2),
    right_bicep_cm         NUMERIC(6, 2),
    hips_cm                NUMERIC(6, 2),
    left_thigh_cm          NUMERIC(6, 2),
    right_thigh_cm         NUMERIC(6, 2),
    neck_cm                NUMERIC(6, 2),
    shoulders_cm           NUMERIC(6, 2),
    left_calf_cm           NUMERIC(6, 2),
    right_calf_cm          NUMERIC(6, 2),
    left_forearm_cm        NUMERIC(6, 2),
    right_forearm_cm       NUMERIC(6, 2),
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, log_date)
);

CREATE INDEX idx_body_logs_user ON body_logs(user_id, log_date DESC);
