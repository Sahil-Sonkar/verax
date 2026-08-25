ALTER TABLE habits
    ADD COLUMN auto_complete_metric_id UUID REFERENCES metrics(id) ON DELETE SET NULL,
    ADD COLUMN auto_complete_threshold NUMERIC(12, 2);

CREATE INDEX idx_habits_auto_metric ON habits(auto_complete_metric_id);

CREATE TABLE medications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(160) NOT NULL,
    dosage          VARCHAR(80),
    instructions    TEXT,
    times           JSONB NOT NULL DEFAULT '["08:00"]'::jsonb,
    weekdays        JSONB NOT NULL DEFAULT '[1,2,3,4,5,6,7]'::jsonb,
    start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date        DATE,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medications_user ON medications(user_id, active);

CREATE TABLE medication_doses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medication_id   UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    scheduled_time  TIME NOT NULL,
    status          VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    taken_at        TIMESTAMPTZ,
    UNIQUE (medication_id, date, scheduled_time)
);

CREATE INDEX idx_doses_user_date ON medication_doses(user_id, date);

CREATE TABLE focus_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind            VARCHAR(24) NOT NULL,
    habit_id        UUID REFERENCES habits(id) ON DELETE SET NULL,
    seconds         INT NOT NULL,
    date            DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_date ON focus_sessions(user_id, date);
