import { SQLiteDatabase } from 'expo-sqlite';
import { migrate001 } from './001_initial';

const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS migrations (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    version INTEGER NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

type MigrationFn = (db: SQLiteDatabase) => Promise<void>;

const migrations: { version: number; fn: MigrationFn }[] = [
  { version: 1, fn: migrate001 },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(MIGRATIONS_TABLE);

  const applied = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM migrations ORDER BY version ASC'
  );
  const appliedVersions = new Set(applied.map(r => r.version));

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      await migration.fn(db);
      await db.runAsync(
        'INSERT INTO migrations (version) VALUES (?)',
        migration.version
      );
    }
  }
}
