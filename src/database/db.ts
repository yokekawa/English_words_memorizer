import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { Database } from './helpers';
import { runMigrations } from './migrations';

let initPromise: Promise<Database> | null = null;

export function getDatabase(): Promise<Database> {
  if (!initPromise) {
    initPromise = (async () => {
      const db = SQLite.openDatabase('english_words.db');
      await runMigrations(db);
      return db;
    })();
  }
  return initPromise;
}

interface DatabaseContextValue {
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextValue>({ isReady: false });

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    getDatabase()
      .then(() => setIsReady(true))
      .catch(err => console.error('Failed to initialize database:', err));
  }, []);

  return (
    <DatabaseContext.Provider value={{ isReady }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDb(): DatabaseContextValue {
  return useContext(DatabaseContext);
}
