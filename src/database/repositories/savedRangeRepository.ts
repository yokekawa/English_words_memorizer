import { Database, queryAll, queryFirst, execute } from '../helpers';
import { SavedRange } from '@/types';
import { WordFilter } from '@/types';

interface SavedRangeRow {
  id: number;
  name: string;
  filter_json: string;
  created_at: string;
}

function rowToSavedRange(row: SavedRangeRow): SavedRange {
  return {
    id: row.id,
    name: row.name,
    filter: JSON.parse(row.filter_json) as WordFilter,
    createdAt: row.created_at,
  };
}

export class SavedRangeRepository {
  constructor(private db: Database) {}

  async findAll(): Promise<SavedRange[]> {
    const rows = await queryAll<SavedRangeRow>(
      this.db,
      'SELECT * FROM saved_ranges ORDER BY created_at DESC'
    );
    return rows.map(rowToSavedRange);
  }

  async insert(name: string, filter: WordFilter): Promise<SavedRange> {
    const result = await execute(
      this.db,
      'INSERT INTO saved_ranges (name, filter_json) VALUES (?, ?)',
      [name, JSON.stringify(filter)]
    );
    const row = await queryFirst<SavedRangeRow>(
      this.db,
      'SELECT * FROM saved_ranges WHERE id = ?',
      [result.lastInsertRowId]
    );
    return rowToSavedRange(row!);
  }

  async delete(id: number): Promise<void> {
    await execute(this.db, 'DELETE FROM saved_ranges WHERE id = ?', [id]);
  }
}
