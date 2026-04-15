import { SQLiteDatabase } from 'expo-sqlite';
import { Word, WordDraft, PartOfSpeech, Phonetic } from '@/types';
import { ConjugationRepository } from './conjugationRepository';

interface WordRow {
  id: number;
  base_form: string;
  part_of_speech: string;
  phonetic_text: string | null;
  phonetic_audio: string | null;
  jp_meaning: string;
  example: string | null;
  times_correct: number;
  times_incorrect: number;
  last_studied: string | null;
  next_review: string | null;
  created_at: string;
}

function rowToWord(row: WordRow): Omit<Word, 'conjugations'> {
  const phonetic: Phonetic | null = row.phonetic_text
    ? { text: row.phonetic_text, audioUrl: row.phonetic_audio ?? undefined }
    : null;
  return {
    id: row.id,
    baseForm: row.base_form,
    partOfSpeech: row.part_of_speech as PartOfSpeech,
    phonetic,
    japaneseMeaning: row.jp_meaning,
    exampleSentence: row.example ?? undefined,
    timesCorrect: row.times_correct,
    timesIncorrect: row.times_incorrect,
    lastStudied: row.last_studied,
    nextReview: row.next_review,
    createdAt: row.created_at,
  };
}

export class WordRepository {
  constructor(private db: SQLiteDatabase) {}

  async findAll(): Promise<Word[]> {
    const rows = await this.db.getAllAsync<WordRow>(
      'SELECT * FROM words ORDER BY created_at DESC'
    );
    return this.attachConjugations(rows);
  }

  async findById(id: number): Promise<Word | null> {
    const row = await this.db.getFirstAsync<WordRow>(
      'SELECT * FROM words WHERE id = ?',
      id
    );
    if (!row) return null;
    const [word] = await this.attachConjugations([row]);
    return word;
  }

  async findByBaseForm(baseForm: string): Promise<Word | null> {
    const row = await this.db.getFirstAsync<WordRow>(
      'SELECT * FROM words WHERE base_form = ? COLLATE NOCASE',
      baseForm
    );
    if (!row) return null;
    const [word] = await this.attachConjugations([row]);
    return word;
  }

  async search(query: string): Promise<Word[]> {
    const rows = await this.db.getAllAsync<WordRow>(
      `SELECT * FROM words WHERE base_form LIKE ? OR jp_meaning LIKE ?
       ORDER BY base_form ASC`,
      `%${query}%`,
      `%${query}%`
    );
    return this.attachConjugations(rows);
  }

  async findByDateRange(from: string, to: string): Promise<Word[]> {
    const rows = await this.db.getAllAsync<WordRow>(
      `SELECT * FROM words WHERE created_at >= ? AND created_at <= ?
       ORDER BY created_at DESC`,
      from,
      to + ' 23:59:59'
    );
    return this.attachConjugations(rows);
  }

  async countByDateRange(from: string, to: string): Promise<number> {
    const result = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM words
       WHERE created_at >= ? AND created_at <= ?`,
      from,
      to + ' 23:59:59'
    );
    return result?.count ?? 0;
  }

  async findDueForReview(): Promise<Word[]> {
    const now = new Date().toISOString();
    const rows = await this.db.getAllAsync<WordRow>(
      `SELECT * FROM words WHERE next_review IS NULL OR next_review <= ?
       ORDER BY next_review ASC`,
      now
    );
    return this.attachConjugations(rows);
  }

  async findRecent(days: number): Promise<Word[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const rows = await this.db.getAllAsync<WordRow>(
      `SELECT * FROM words WHERE created_at >= ? ORDER BY created_at DESC`,
      cutoff.toISOString()
    );
    return this.attachConjugations(rows);
  }

  async insert(draft: WordDraft): Promise<Word> {
    const result = await this.db.runAsync(
      `INSERT INTO words (base_form, part_of_speech, phonetic_text, phonetic_audio,
        jp_meaning, example)
       VALUES (?, ?, ?, ?, ?, ?)`,
      draft.baseForm,
      draft.partOfSpeech,
      draft.phonetic?.text ?? null,
      draft.phonetic?.audioUrl ?? null,
      draft.japaneseMeaning,
      draft.exampleSentence ?? null
    );
    const wordId = result.lastInsertRowId;
    const conjRepo = new ConjugationRepository(this.db);
    for (const conj of draft.conjugations) {
      await conjRepo.insert(wordId, conj.type, conj.form);
    }
    const word = await this.findById(wordId);
    if (!word) throw new Error('Failed to retrieve inserted word');
    return word;
  }

  async updateStats(
    id: number,
    isCorrect: boolean,
    nextReview: string
  ): Promise<void> {
    if (isCorrect) {
      await this.db.runAsync(
        `UPDATE words SET times_correct = times_correct + 1,
           last_studied = datetime('now'), next_review = ?
         WHERE id = ?`,
        nextReview,
        id
      );
    } else {
      await this.db.runAsync(
        `UPDATE words SET times_incorrect = times_incorrect + 1,
           last_studied = datetime('now'), next_review = ?
         WHERE id = ?`,
        nextReview,
        id
      );
    }
  }

  async update(id: number, updates: Partial<WordDraft>): Promise<void> {
    const sets: string[] = [];
    const values: (string | null)[] = [];

    if (updates.baseForm !== undefined) {
      sets.push('base_form = ?');
      values.push(updates.baseForm);
    }
    if (updates.partOfSpeech !== undefined) {
      sets.push('part_of_speech = ?');
      values.push(updates.partOfSpeech);
    }
    if (updates.phonetic !== undefined) {
      sets.push('phonetic_text = ?', 'phonetic_audio = ?');
      values.push(updates.phonetic?.text ?? null, updates.phonetic?.audioUrl ?? null);
    }
    if (updates.japaneseMeaning !== undefined) {
      sets.push('jp_meaning = ?');
      values.push(updates.japaneseMeaning);
    }
    if (updates.exampleSentence !== undefined) {
      sets.push('example = ?');
      values.push(updates.exampleSentence ?? null);
    }

    if (sets.length === 0) return;
    values.push(String(id));
    await this.db.runAsync(
      `UPDATE words SET ${sets.join(', ')} WHERE id = ?`,
      ...values
    );
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM words WHERE id = ?', id);
  }

  private async attachConjugations(rows: WordRow[]): Promise<Word[]> {
    if (rows.length === 0) return [];
    const conjRepo = new ConjugationRepository(this.db);
    const words = await Promise.all(
      rows.map(async row => {
        const conjugations = await conjRepo.findByWordId(row.id);
        return { ...rowToWord(row), conjugations };
      })
    );
    return words;
  }
}
