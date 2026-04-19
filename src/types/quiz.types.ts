export type QuizMode =
  | 'jp_to_en'
  | 'audio_to_en'
  | 'base_to_past'
  | 'base_to_past_participle'
  | 'base_to_past_both'
  | 'base_to_plural'
  | 'base_to_comparative'
  | 'base_to_superlative'
  | 'base_to_comparative_both';

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
  /** Second expected answer for "_both" modes (e.g. past participle, superlative) */
  correctAnswer2?: string;
  /** Label for the first answer field when dual-input (e.g. "過去形") */
  label1?: string;
  /** Label for the second answer field when dual-input (e.g. "過去分詞形") */
  label2?: string;
  /** Audio URL for audio_to_en mode */
  audioUrl?: string;
  hint?: string;
}

export interface QuizAttempt {
  questionId: string;
  wordId: number;
  userAnswer: string;
  /** Second user answer for "_both" modes */
  userAnswer2?: string;
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
    correctAnswer2?: string;
    userAnswer: string;
    userAnswer2?: string;
    isCorrect: boolean;
  }[];
}
