import { Database, queryAll, execute, executeMany } from '../helpers';
import { migrate001 } from './001_initial';
import { migrate002 } from './002_saved_ranges';
import { migrate003 } from './003_multi_conjugations';

const CREATE_MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version INTEGER NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

type MigrationFn = (db: Database) => Promise<void>;

const migrations: { version: number; fn: MigrationFn }[] = [
  { version: 1, fn: migrate001 },
  { version: 2, fn: migrate002 },
  { version: 3, fn: migrate003 },
];

export async function runMigrations(db: Database): Promise<void> {
  await executeMany(db, [{ sql: CREATE_MIGRATIONS_TABLE }]);

  const applied = await queryAll<{ version: number }>(
    db,
    'SELECT version FROM migrations ORDER BY version ASC'
  );
  const appliedVersions = new Set(applied.map(r => r.version));

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      await migration.fn(db);
      await execute(db, 'INSERT INTO migrations (version) VALUES (?)', [
        migration.version,
      ]);
    }
  }
}
