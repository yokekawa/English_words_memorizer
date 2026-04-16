import * as SQLite from 'expo-sqlite';

export type Database = SQLite.SQLiteDatabase;
export type SQLArgs = (string | number | null)[];

export function queryAll<T>(
  db: Database,
  sql: string,
  args: SQLArgs = []
): Promise<T[]> {
  return db.getAllAsync<T>(sql, args);
}

export function queryFirst<T>(
  db: Database,
  sql: string,
  args: SQLArgs = []
): Promise<T | null> {
  return db.getFirstAsync<T>(sql, args);
}

export function execute(
  db: Database,
  sql: string,
  args: SQLArgs = []
): Promise<SQLite.SQLiteRunResult> {
  return db.runAsync(sql, args);
}

export async function executeMany(
  db: Database,
  statements: { sql: string; args?: SQLArgs }[]
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const { sql, args = [] } of statements) {
      await txn.runAsync(sql, args);
    }
  });
}
