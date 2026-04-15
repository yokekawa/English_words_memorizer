import { WordRepository } from '@/database/repositories/wordRepository';
import { getDatabase } from '@/database/db';
import { QuizAttempt, QuizResult, QuizSession } from '@/types';

const SRS_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60, 90];

function computeNextReview(timesCorrect: number, isCorrect: boolean): string {
  const intervalDays = isCorrect
    ? SRS_INTERVALS_DAYS[Math.min(timesCorrect, SRS_INTERVALS_DAYS.length - 1)]
    : 1;
  const next = new Date();
  next.setDate(next.getDate() + intervalDays);
  return next.toISOString();
}

export function evaluateAnswer(
  userAnswer: string,
  correctAnswer: string
): boolean {
  return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
}

export async function recordAttempt(
  attempt: QuizAttempt,
  currentTimesCorrect: number
): Promise<void> {
  const nextReview = computeNextReview(currentTimesCorrect, attempt.isCorrect);
  const db = await getDatabase();
  const repo = new WordRepository(db);
  await repo.updateStats(attempt.wordId, attempt.isCorrect, nextReview);
}

export function buildResult(session: QuizSession): QuizResult {
  const totalQuestions = session.attempts.length;
  const correctCount = session.attempts.filter(a => a.isCorrect).length;
  const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;

  const startMs = new Date(session.startedAt).getTime();
  const endMs = session.completedAt
    ? new Date(session.completedAt).getTime()
    : Date.now();

  const perWordResults = session.attempts.map(attempt => {
    const question = session.questions.find(q => q.id === attempt.questionId)!;
    return {
      wordId: attempt.wordId,
      baseForm:
        question.mode === 'jp_to_en'
          ? question.correctAnswer
          : question.prompt.split('  ―  ')[0].trim(),
      prompt: question.prompt,
      correctAnswer: question.correctAnswer,
      userAnswer: attempt.userAnswer,
      isCorrect: attempt.isCorrect,
    };
  });

  return {
    sessionId: session.id,
    mode: session.mode,
    filter: session.filter,
    totalQuestions,
    correctCount,
    accuracy,
    durationMs: endMs - startMs,
    perWordResults,
  };
}
