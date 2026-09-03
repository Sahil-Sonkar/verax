CREATE TABLE content_ideas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform            VARCHAR(16) NOT NULL,
    phase               VARCHAR(24) NOT NULL,
    idea                TEXT NOT NULL,
    happened            TEXT,
    learned             TEXT,
    potential_platform  TEXT,
    hook                TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_ideas_user_platform ON content_ideas(user_id, platform, phase);
