import { Database, executeMany } from '../helpers';

/**
 * SQLite cannot ALTER a unique constraint, so rebuild the conjugations table:
 * old: UNIQUE(word_id, type) — only one form per type
 * new: UNIQUE(word_id, type, form) — multiple forms per type allowed
 *      (e.g. be → past_tense=was, past_tense=were)
 */
export async function migrate003(db: Database): Promise<void> {
  await executeMany(db, [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS conjugations_new (
          id        INTEGER PRIMARY KEY AUTOINCREMENT,
          word_id   INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
          type      TEXT NOT NULL,
          form      TEXT NOT NULL,
          UNIQUE(word_id, type, form)
        )
      `,
    },
    {
      sql: `
        INSERT INTO conjugations_new (id, word_id, type, form)
        SELECT id, word_id, type, form FROM conjugations
      `,
    },
    { sql: `DROP TABLE conjugations` },
    { sql: `ALTER TABLE conjugations_new RENAME TO conjugations` },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_conjugations_word_id ON conjugations(word_id)`,
    },
  ]);
}
