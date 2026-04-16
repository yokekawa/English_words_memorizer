import * as SQLite from 'expo-sqlite/legacy';

export type Database = SQLite.SQLiteDatabase;
export type SQLArgs = (string | number | null)[];

export function queryAll<T>(
  db: Database,
  sql: string,
  args: SQLArgs = []
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.transaction(
      tx => {
        tx.executeSql(
          sql,
          args,
          (_, result) => resolve(result.rows._array as T[]),
          (_, error) => { reject(error); return false; }
        );
      },
      error => reject(error)
    );
  });
}

export function queryFirst<T>(
  db: Database,
  sql: string,
  args: SQLArgs = []
): Promise<T | null> {
  return queryAll<T>(db, sql, args).then(rows => rows[0] ?? null);
}

export function execute(
  db: Database,
  sql: string,
  args: SQLArgs = []
): Promise<SQLite.SQLResultSet> {
  return new Promise((resolve, reject) => {
    db.transaction(
      tx => {
        tx.executeSql(
          sql,
          args,
          (_, result) => resolve(result),
          (_, error) => { reject(error); return false; }
        );
      },
      error => reject(error)
    );
  });
}

export function executeMany(
  db: Database,
  statements: { sql: string; args?: SQLArgs }[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.transaction(
      tx => {
        for (const { sql, args = [] } of statements) {
          tx.executeSql(
            sql,
            args,
            undefined,
            (_, error) => { reject(error); return false; }
          );
        }
      },
      error => reject(error),
      () => resolve()
    );
  });
}
