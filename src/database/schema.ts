export const CREATE_WORDS_TABLE = `
  CREATE TABLE IF NOT EXISTS words (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    base_form       TEXT NOT NULL UNIQUE COLLATE NOCASE,
    part_of_speech  TEXT NOT NULL DEFAULT 'unknown',
    phonetic_text   TEXT,
    phonetic_audio  TEXT,
    jp_meaning      TEXT NOT NULL,
    example         TEXT,
    times_correct   INTEGER NOT NULL DEFAULT 0,
    times_incorrect INTEGER NOT NULL DEFAULT 0,
    last_studied    TEXT,
    next_review     TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

export const CREATE_CONJUGATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS conjugations (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    word_id   INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    type      TEXT NOT NULL,
    form      TEXT NOT NULL,
    UNIQUE(word_id, type, form)
  )
`;

export const CREATE_QUIZ_SESSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS quiz_sessions (
    id           TEXT PRIMARY KEY,
    mode         TEXT NOT NULL,
    filter_json  TEXT NOT NULL DEFAULT '{"type":"all"}',
    started_at   TEXT NOT NULL,
    completed_at TEXT
  )
`;

export const CREATE_QUIZ_ATTEMPTS_TABLE = `
  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id   TEXT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    word_id      INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    quiz_mode    TEXT NOT NULL,
    prompt       TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    user_answer  TEXT NOT NULL,
    is_correct   INTEGER NOT NULL,
    time_spent   INTEGER NOT NULL,
    attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

export const CREATE_SAVED_RANGES_TABLE = `
  CREATE TABLE IF NOT EXISTS saved_ranges (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    filter_json TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

export const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_conjugations_word_id ON conjugations(word_id)`,
  `CREATE INDEX IF NOT EXISTS idx_attempts_word_id ON quiz_attempts(word_id)`,
  `CREATE INDEX IF NOT EXISTS idx_words_next_review ON words(next_review)`,
  `CREATE INDEX IF NOT EXISTS idx_words_created_at ON words(created_at)`,
];
