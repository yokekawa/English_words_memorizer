import { Database, executeMany } from '../helpers';
import { CREATE_SAVED_RANGES_TABLE } from '../schema';

export async function migrate002(db: Database): Promise<void> {
  await executeMany(db, [{ sql: CREATE_SAVED_RANGES_TABLE }]);
}
