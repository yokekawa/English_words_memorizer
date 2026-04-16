export type QuizMode =
  | 'jp_to_en'
  | 'base_to_past'
  | 'base_to_plural'
  | 'base_to_participle'
  | 'base_to_comparative';

import { PartOfSpeech } from './word.types';

export type WordFilter =
  | { type: 'all'; pos?: PartOfSpeech[] }
  | { type: 'due'; pos?: PartOfSpeech[] }
  | { type: 'recent'; days: number; pos?: PartOfSpeech[] }
  | { type: 'date_range'; from: string; to: string; pos?: PartOfSpeech[] }
  | { type: 'word_ids'; ids: number[] };

export interface QuizQuestion {
  id: string;
  wordId: number;
  mode: QuizMode;
  prompt: string;
  correctAnswer: string;
  hint?: string;
}

export interface QuizAttempt {
  questionId: string;
  wordId: number;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentMs: number;
}

export interface QuizSession {
  id: string;
  mode: QuizMode;
  filter: WordFilter;
  questions: QuizQuestion[];
  attempts: QuizAttempt[];
  startedAt: string;
  completedAt?: string;
}

export interface QuizResult {
  sessionId: string;
  mode: QuizMode;
  filter: WordFilter;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  durationMs: number;
  perWordResults: {
    wordId: number;
    baseForm: string;
    prompt: string;
    correctAnswer: string;
    userAnswer: string;
    isCorrect: boolean;
  }[];
}
