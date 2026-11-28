ALTER TABLE users ADD COLUMN is_banned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN banned_until TEXT;
ALTER TABLE users ADD COLUMN ban_reason TEXT;
ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_seen TEXT;

CREATE TABLE IF NOT EXISTS moderation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_user_id TEXT NOT NULL,
  moderator_email TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_moderation_logs_target
ON moderation_logs(target_user_id, created_at DESC);
