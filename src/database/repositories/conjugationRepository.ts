import { SQLiteDatabase } from 'expo-sqlite';
import { Conjugation, ConjugationType } from '@/types';

interface ConjugationRow {
  id: number;
  word_id: number;
  type: string;
  form: string;
}

export class ConjugationRepository {
  constructor(private db: SQLiteDatabase) {}

  async findByWordId(wordId: number): Promise<Conjugation[]> {
    const rows = await this.db.getAllAsync<ConjugationRow>(
      'SELECT * FROM conjugations WHERE word_id = ?',
      wordId
    );
    return rows.map(r => ({
      id: r.id,
      wordId: r.word_id,
      type: r.type as ConjugationType,
      form: r.form,
    }));
  }

  async insert(
    wordId: number,
    type: ConjugationType,
    form: string
  ): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO conjugations (word_id, type, form) VALUES (?, ?, ?)`,
      wordId,
      type,
      form
    );
  }

  async deleteByWordId(wordId: number): Promise<void> {
    await this.db.runAsync(
      'DELETE FROM conjugations WHERE word_id = ?',
      wordId
    );
  }
}
