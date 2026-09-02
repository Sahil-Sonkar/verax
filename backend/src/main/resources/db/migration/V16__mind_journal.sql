CREATE TABLE mind_tags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(48) NOT NULL,
    color       VARCHAR(16) NOT NULL DEFAULT '#3d7ec9',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_mind_tags_user_name ON mind_tags (user_id, lower(name));
CREATE INDEX idx_mind_tags_user ON mind_tags (user_id);

CREATE TABLE mind_notes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mind_notes_user ON mind_notes (user_id, created_at DESC);

CREATE TABLE mind_note_tags (
    note_id UUID NOT NULL REFERENCES mind_notes(id) ON DELETE CASCADE,
    tag_id  UUID NOT NULL REFERENCES mind_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX idx_mind_note_tags_tag ON mind_note_tags (tag_id);
