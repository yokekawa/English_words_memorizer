import React, { createContext, useContext, useEffect, useState } from 'react';
import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { runMigrations } from './migrations';

const DB_NAME = 'english_words.db';

let dbInstance: SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await openDatabaseAsync(DB_NAME);
    await dbInstance.execAsync('PRAGMA foreign_keys = ON;');
    await runMigrations(dbInstance);
  }
  return dbInstance;
}

interface DatabaseContextValue {
  db: SQLiteDatabase | null;
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextValue>({
  db: null,
  isReady: false,
});

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    getDatabase()
      .then(database => {
        setDb(database);
        setIsReady(true);
      })
      .catch(err => {
        console.error('Failed to initialize database:', err);
      });
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, isReady }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDb(): DatabaseContextValue {
  return useContext(DatabaseContext);
}
