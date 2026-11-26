CREATE TABLE IF NOT EXISTS friend_form_settings (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  value_json TEXT NOT NULL DEFAULT '{}',
  updated TEXT NOT NULL
);
