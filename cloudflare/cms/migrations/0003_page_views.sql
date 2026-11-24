-- Aggregate real page views per published article or work, without changing content.
CREATE TABLE IF NOT EXISTS page_views (
  kind TEXT NOT NULL CHECK(kind IN ('post','work')),
  slug TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0 CHECK(views>=0),
  PRIMARY KEY(kind,slug)
);
