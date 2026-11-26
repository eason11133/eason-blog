ALTER TABLE friend_requests ADD COLUMN avatar TEXT NOT NULL DEFAULT '';
DROP TRIGGER IF EXISTS friend_request_approval;
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
    json_patch(json_object('name',NEW.name,'url',NEW.url,'description',NEW.description),CASE WHEN NEW.avatar<>'' THEN json_object('avatar',NEW.avatar) ELSE '{}' END)),updated=NEW.reviewed WHERE singleton=1;
END;
