CREATE TABLE google_calendar_accounts (
    user_id                  UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    google_email             VARCHAR(191) NOT NULL,
    calendar_id              VARCHAR(128) NOT NULL DEFAULT 'primary',
    refresh_token_enc        TEXT NOT NULL,
    access_token_enc         TEXT,
    access_token_expires_at  TIMESTAMPTZ,
    sync_token               TEXT,
    last_synced_at           TIMESTAMPTZ,
    last_error               TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE routine_blocks
    ADD COLUMN google_event_id VARCHAR(128),
    ADD COLUMN google_etag VARCHAR(128),
    ADD COLUMN google_updated_at TIMESTAMPTZ,
    ADD COLUMN origin VARCHAR(16) NOT NULL DEFAULT 'VERAX';

CREATE UNIQUE INDEX idx_routine_blocks_google_event
    ON routine_blocks(user_id, google_event_id)
    WHERE google_event_id IS NOT NULL;
