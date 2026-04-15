import { SQLiteDatabase } from 'expo-sqlite';
import {
  CREATE_WORDS_TABLE,
  CREATE_CONJUGATIONS_TABLE,
  CREATE_QUIZ_SESSIONS_TABLE,
  CREATE_QUIZ_ATTEMPTS_TABLE,
  CREATE_INDEXES,
} from '../schema';

export async function migrate001(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_WORDS_TABLE);
  await db.execAsync(CREATE_CONJUGATIONS_TABLE);
  await db.execAsync(CREATE_QUIZ_SESSIONS_TABLE);
  await db.execAsync(CREATE_QUIZ_ATTEMPTS_TABLE);
  for (const indexSql of CREATE_INDEXES) {
    await db.execAsync(indexSql);
  }
}
