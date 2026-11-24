-- Separate footer settings; no existing data is changed.
CREATE TABLE IF NOT EXISTS footer_links (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  links_json TEXT NOT NULL DEFAULT '{}',
  updated TEXT NOT NULL
);
