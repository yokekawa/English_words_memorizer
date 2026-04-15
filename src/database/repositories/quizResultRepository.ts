import { SQLiteDatabase } from 'expo-sqlite';
import { QuizSession, QuizAttempt, QuizMode, WordFilter } from '@/types';

export class QuizResultRepository {
  constructor(private db: SQLiteDatabase) {}

  async saveSession(session: QuizSession): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO quiz_sessions (id, mode, filter_json, started_at, completed_at)
       VALUES (?, ?, ?, ?, ?)`,
      session.id,
      session.mode,
      JSON.stringify(session.filter),
      session.startedAt,
      session.completedAt ?? null
    );

    for (const attempt of session.attempts) {
      const question = session.questions.find(q => q.id === attempt.questionId);
      if (!question) continue;
      await this.db.runAsync(
        `INSERT OR REPLACE INTO quiz_attempts
           (session_id, word_id, quiz_mode, prompt, correct_answer, user_answer, is_correct, time_spent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        session.id,
        attempt.wordId,
        session.mode,
        question.prompt,
        question.correctAnswer,
        attempt.userAnswer,
        attempt.isCorrect ? 1 : 0,
        attempt.timeSpentMs
      );
    }
  }

  async completeSession(sessionId: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE quiz_sessions SET completed_at = datetime('now') WHERE id = ?`,
      sessionId
    );
  }
}
