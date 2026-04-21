import { create } from 'zustand';
import {
  QuizSession,
  QuizAttempt,
  QuizResult,
  QuizMode,
  WordFilter,
} from '@/types';
import { quizGenerationService } from '@/services/quizGenerationService';
import { evaluateAnswer, evaluateAnswerAny, recordAttempt, buildResult } from '@/services/scoringService';
import { QuizResultRepository } from '@/database/repositories/quizResultRepository';
import { getDatabase } from '@/database/db';
import { useWordStore } from './wordStore';

interface QuizState {
  session: QuizSession | null;
  currentIndex: number;
  questionStartTime: number;
  isLoading: boolean;
  error: string | null;
  startSession: (mode: QuizMode, filter: WordFilter, wordCount?: number) => Promise<void>;
  submitAnswer: (userAnswer: string, userAnswer2?: string) => Promise<QuizAttempt | null>;
  nextQuestion: () => void;
  endSession: () => Promise<QuizResult | null>;
  clearSession: () => void;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  session: null,
  currentIndex: 0,
  questionStartTime: 0,
  isLoading: false,
  error: null,

  startSession: async (mode, filter, wordCount = 10) => {
    set({ isLoading: true, error: null });
    try {
      const session = await quizGenerationService.createSession(mode, filter, wordCount);
      set({ session, currentIndex: 0, questionStartTime: Date.now(), isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  submitAnswer: async (userAnswer: string, userAnswer2?: string) => {
    const { session, currentIndex, questionStartTime } = get();
    if (!session) return null;
    const question = session.questions[currentIndex];
    if (!question) return null;

    const acceptable1 = question.acceptableAnswers ?? [question.correctAnswer];
    const correct1 = evaluateAnswerAny(userAnswer, acceptable1);
    const correct2 = question.correctAnswer2
      ? evaluateAnswerAny(
          userAnswer2 ?? '',
          question.acceptableAnswers2 ?? [question.correctAnswer2]
        )
      : true;
    const isCorrect = correct1 && correct2;
    const timeSpentMs = Date.now() - questionStartTime;

    const attempt: QuizAttempt = {
      questionId: question.id,
      wordId: question.wordId,
      userAnswer,
      userAnswer2: question.correctAnswer2 ? (userAnswer2 ?? '') : undefined,
      isCorrect,
      timeSpentMs,
    };

    // Find current correct count for SRS calculation
    const word = useWordStore.getState().words.find(w => w.id === question.wordId);
    await recordAttempt(attempt, word?.timesCorrect ?? 0);
    // Refresh word stats in word store
    await useWordStore.getState().refreshWord(question.wordId);

    set(state => ({
      session: state.session
        ? { ...state.session, attempts: [...state.session.attempts, attempt] }
        : null,
    }));

    return attempt;
  },

  nextQuestion: () => {
    set(state => ({
      currentIndex: state.currentIndex + 1,
      questionStartTime: Date.now(),
    }));
  },

  endSession: async () => {
    const { session } = get();
    if (!session) return null;

    const completedSession: QuizSession = {
      ...session,
      completedAt: new Date().toISOString(),
    };
    set({ session: completedSession });

    const result = buildResult(completedSession);

    // Persist session to DB
    const db = await getDatabase();
    const repo = new QuizResultRepository(db);
    await repo.saveSession(completedSession);

    return result;
  },

  clearSession: () => {
    set({ session: null, currentIndex: 0 });
  },
}));
