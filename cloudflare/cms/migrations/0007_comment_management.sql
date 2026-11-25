ALTER TABLE comments ADD COLUMN read_at TEXT;
ALTER TABLE comments ADD COLUMN notification_status TEXT NOT NULL DEFAULT 'not_configured';
CREATE INDEX IF NOT EXISTS comments_inbox_idx ON comments(read_at,created DESC);
CREATE TABLE IF NOT EXISTS comment_owner (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  provider TEXT,
  user_id TEXT,
  name TEXT,
  avatar TEXT,
  paired_at TEXT,
  pair_hash TEXT,
  pair_expires INTEGER
);
INSERT OR IGNORE INTO comment_owner(singleton) VALUES(1);
CREATE TABLE IF NOT EXISTS comment_notification_settings (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  channel TEXT NOT NULL DEFAULT 'off' CHECK(channel IN ('off','line','discord'))
);
INSERT OR IGNORE INTO comment_notification_settings(singleton) VALUES(1);
