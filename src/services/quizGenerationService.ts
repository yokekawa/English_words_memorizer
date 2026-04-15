import { WordRepository } from '@/database/repositories/wordRepository';
import { getDatabase } from '@/database/db';
import { QuizMode, QuizQuestion, QuizSession, WordFilter, Word } from '@/types';
import { QUIZ_MODE_CONFIGS } from '@/constants/quizModes';

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function buildQuestion(word: Word, mode: QuizMode): QuizQuestion | null {
  if (mode === 'jp_to_en') {
    return {
      id: makeId(),
      wordId: word.id,
      mode,
      prompt: word.japaneseMeaning,
      correctAnswer: word.baseForm,
    };
  }

  const conjTypeMap: Record<string, string> = {
    base_to_past: 'past_tense',
    base_to_plural: 'plural',
    base_to_participle: 'present_participle',
    base_to_comparative: 'comparative',
  };

  const promptMap: Record<string, string> = {
    base_to_past: '過去形は？',
    base_to_plural: '複数形は？',
    base_to_participle: '現在分詞形（-ing）は？',
    base_to_comparative: '比較級は？',
  };

  const conjType = conjTypeMap[mode];
  const conj = word.conjugations.find(c => c.type === conjType);
  if (!conj) return null;

  return {
    id: makeId(),
    wordId: word.id,
    mode,
    prompt: `${word.baseForm}  ―  ${promptMap[mode]}`,
    correctAnswer: conj.form,
  };
}

function weightedShuffle(words: Word[]): Word[] {
  return words
    .map(w => ({
      word: w,
      weight: w.timesIncorrect / (w.timesCorrect + 1) + Math.random() * 0.3,
    }))
    .sort((a, b) => b.weight - a.weight)
    .map(item => item.word);
}

export class QuizGenerationService {
  async createSession(
    mode: QuizMode,
    filter: WordFilter,
    wordCount = 10
  ): Promise<QuizSession> {
    const db = await getDatabase();
    const repo = new WordRepository(db);

    let candidates: Word[];
    switch (filter.type) {
      case 'due':
        candidates = await repo.findDueForReview();
        break;
      case 'recent':
        candidates = await repo.findRecent(filter.days);
        break;
      case 'date_range':
        candidates = await repo.findByDateRange(filter.from, filter.to);
        break;
      default:
        candidates = await repo.findAll();
    }

    // Filter to words that have required conjugation
    const config = QUIZ_MODE_CONFIGS.find(c => c.mode === mode);
    if (config?.requiredConjugationType) {
      candidates = candidates.filter(w =>
        w.conjugations.some(c => c.type === config.requiredConjugationType)
      );
    }

    const selected = weightedShuffle(candidates).slice(0, wordCount);
    const questions: QuizQuestion[] = selected
      .map(w => buildQuestion(w, mode))
      .filter((q): q is QuizQuestion => q !== null);

    return {
      id: makeId(),
      mode,
      filter,
      questions,
      attempts: [],
      startedAt: new Date().toISOString(),
    };
  }

  async countAvailableWords(mode: QuizMode, filter: WordFilter): Promise<number> {
    const db = await getDatabase();
    const repo = new WordRepository(db);

    if (filter.type === 'date_range') {
      return repo.countByDateRange(filter.from, filter.to);
    }

    let words: Word[];
    switch (filter.type) {
      case 'due':
        words = await repo.findDueForReview();
        break;
      case 'recent':
        words = await repo.findRecent(filter.days);
        break;
      default:
        words = await repo.findAll();
    }

    const config = QUIZ_MODE_CONFIGS.find(c => c.mode === mode);
    if (config?.requiredConjugationType) {
      return words.filter(w =>
        w.conjugations.some(c => c.type === config.requiredConjugationType)
      ).length;
    }
    return words.length;
  }
}

export const quizGenerationService = new QuizGenerationService();
