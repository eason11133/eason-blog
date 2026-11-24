-- Preserve existing comments; add verified visitor identity metadata.
ALTER TABLE comments ADD COLUMN auth_provider TEXT;
ALTER TABLE comments ADD COLUMN auth_user_id TEXT;
ALTER TABLE comments ADD COLUMN avatar_url TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS comments_author_idx ON comments(auth_provider,auth_user_id,created);
