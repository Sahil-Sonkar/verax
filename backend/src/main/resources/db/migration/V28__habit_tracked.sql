ALTER TABLE habits ADD COLUMN tracked BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE habits SET tracked = TRUE
WHERE lower(name) ~ '(sleep|water|step|read|supplement|exercise|workout|meditat)';
