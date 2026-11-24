-- Independent friend-link storage; preserve the existing homepage/about settings.
CREATE TABLE IF NOT EXISTS friend_sites (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  links_json TEXT NOT NULL DEFAULT '[]',
  updated TEXT NOT NULL
);
