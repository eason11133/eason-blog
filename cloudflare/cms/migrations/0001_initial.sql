-- Cloudflare D1 schema for Eason's site. Apply before deploying the Worker.
-- Existing Astro Markdown remains intact until import/acceptance testing.
CREATE TABLE IF NOT EXISTS documents (
  kind TEXT NOT NULL CHECK(kind IN ('post','work')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  body_markdown TEXT NOT NULL DEFAULT '',
  categories_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  date TEXT NOT NULL,
  updated TEXT NOT NULL,
  draft INTEGER NOT NULL DEFAULT 1 CHECK(draft IN (0,1)),
  pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN (0,1)),
  PRIMARY KEY(kind, slug)
);
CREATE INDEX IF NOT EXISTS documents_visible_idx ON documents(kind,draft,date DESC);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY CHECK(key IN ('homepage','about')),
  value_json TEXT NOT NULL,
  updated TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('post','work')),
  slug TEXT NOT NULL,
  parent_id TEXT,
  nickname TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','hidden')),
  created TEXT NOT NULL,
  CONSTRAINT comment_parent FOREIGN KEY(parent_id) REFERENCES comments(id)
);
CREATE INDEX IF NOT EXISTS comments_list_idx ON comments(kind,slug,status,created);
CREATE TABLE IF NOT EXISTS rate_limits (
  actor_hash TEXT NOT NULL,
  action TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start INTEGER NOT NULL,
  PRIMARY KEY(actor_hash, action)
);
