CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  microsoft_sub TEXT UNIQUE NOT NULL,
  email TEXT,
  display_name TEXT,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'player',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS progress (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  xp INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  best_combo INTEGER NOT NULL DEFAULT 0,
  medals TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);

DROP TABLE IF EXISTS questions;
CREATE TABLE questions (
  id INTEGER PRIMARY KEY,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  question TEXT NOT NULL,
  answers TEXT NOT NULL,
  correct INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  suitable TEXT NOT NULL DEFAULT '["quiz"]'
);
