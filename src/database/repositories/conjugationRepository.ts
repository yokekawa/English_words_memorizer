import { Database, queryAll, execute } from '../helpers';
import { Conjugation, ConjugationType } from '@/types';

interface ConjugationRow {
  id: number;
  word_id: number;
  type: string;
  form: string;
}

export class ConjugationRepository {
  constructor(private db: Database) {}

  async findByWordId(wordId: number): Promise<Conjugation[]> {
    const rows = await queryAll<ConjugationRow>(
      this.db,
      'SELECT * FROM conjugations WHERE word_id = ?',
      [wordId]
    );
    return rows.map(r => ({
      id: r.id,
      wordId: r.word_id,
      type: r.type as ConjugationType,
      form: r.form,
    }));
  }

  async insert(wordId: number, type: ConjugationType, form: string): Promise<void> {
    // OR IGNORE so duplicates of the same (word, type, form) are silently
    // skipped, while different forms of the same type (be → was/were) coexist.
    await execute(
      this.db,
      `INSERT OR IGNORE INTO conjugations (word_id, type, form) VALUES (?, ?, ?)`,
      [wordId, type, form]
    );
  }

  async deleteByWordId(wordId: number): Promise<void> {
    await execute(this.db, 'DELETE FROM conjugations WHERE word_id = ?', [wordId]);
  }
}
