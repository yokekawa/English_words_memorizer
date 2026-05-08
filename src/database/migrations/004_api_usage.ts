import { Database, executeMany } from '../helpers';
import { CREATE_API_USAGE_TABLE } from '../schema';

export async function migrate004(db: Database): Promise<void> {
  await executeMany(db, [{ sql: CREATE_API_USAGE_TABLE }]);
}
