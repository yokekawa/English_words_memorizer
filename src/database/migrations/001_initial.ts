import { Database, executeMany } from '../helpers';
import {
  CREATE_WORDS_TABLE,
  CREATE_CONJUGATIONS_TABLE,
  CREATE_QUIZ_SESSIONS_TABLE,
  CREATE_QUIZ_ATTEMPTS_TABLE,
  CREATE_INDEXES,
} from '../schema';

export async function migrate001(db: Database): Promise<void> {
  await executeMany(db, [
    { sql: CREATE_WORDS_TABLE },
    { sql: CREATE_CONJUGATIONS_TABLE },
    { sql: CREATE_QUIZ_SESSIONS_TABLE },
    { sql: CREATE_QUIZ_ATTEMPTS_TABLE },
    ...CREATE_INDEXES.map(sql => ({ sql })),
  ]);
}
