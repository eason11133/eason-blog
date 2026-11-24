CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created TEXT NOT NULL,
  reviewed TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_pending_url ON friend_requests(url) WHERE status='pending';
CREATE INDEX IF NOT EXISTS friend_requests_status ON friend_requests(status,created);
-- Approving appends atomically to the existing editable friend list.
CREATE TRIGGER IF NOT EXISTS friend_request_approval
AFTER UPDATE OF status ON friend_requests
WHEN OLD.status='pending' AND NEW.status='approved'
BEGIN
  INSERT OR IGNORE INTO friend_sites(singleton,links_json,updated) VALUES(1,'[]',NEW.reviewed);
  SELECT CASE WHEN EXISTS(SELECT 1 FROM friend_sites, json_each(links_json)
    WHERE singleton=1 AND json_extract(json_each.value,'$.url')=NEW.url)
    THEN RAISE(ABORT,'friend_already_exists') END;
  SELECT CASE WHEN (SELECT json_array_length(links_json) FROM friend_sites WHERE singleton=1)>=60
    THEN RAISE(ABORT,'friend_list_full') END;
  UPDATE friend_sites SET links_json=json_insert(links_json,'$[#]',
    json_object('name',NEW.name,'url',NEW.url,'description',NEW.description)),updated=NEW.reviewed WHERE singleton=1;
END;
