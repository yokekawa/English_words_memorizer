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

  if (mode === 'base_to_comparative') {
    const comparativeConj = word.conjugations.find(c => c.type === 'comparative');
    const superlativeConj = word.conjugations.find(c => c.type === 'superlative');
    const available = (
      [
        comparativeConj ? { form: comparativeConj.form, prompt: '比較級は？' } : null,
        superlativeConj ? { form: superlativeConj.form, prompt: '最上級は？' } : null,
      ].filter(Boolean) as { form: string; prompt: string }[]
    );
    if (available.length === 0) return null;
    const chosen = available[Math.floor(Math.random() * available.length)];
    return {
      id: makeId(),
      wordId: word.id,
      mode,
      prompt: `${word.baseForm}  ―  ${chosen.prompt}`,
      correctAnswer: chosen.form,
    };
  }

  const conjTypeMap: Record<string, string> = {
    base_to_past: 'past_tense',
    base_to_plural: 'plural',
    base_to_participle: 'present_participle',
  };

  const promptMap: Record<string, string> = {
    base_to_past: '過去形は？',
    base_to_plural: '複数形は？',
    base_to_participle: '現在分詞形（-ing）は？',
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

async function loadCandidates(repo: WordRepository, filter: WordFilter): Promise<Word[]> {
  if (filter.type === 'word_ids') {
    return repo.findByIds(filter.ids);
  }

  let words: Word[];
  switch (filter.type) {
    case 'due':
      words = await repo.findDueForReview();
      break;
    case 'recent':
      words = await repo.findRecent(filter.days);
      break;
    case 'date_range':
      words = await repo.findByDateRange(filter.from, filter.to);
      break;
    default:
      words = await repo.findAll();
  }

  if ('pos' in filter && filter.pos && filter.pos.length > 0) {
    words = words.filter(w => filter.pos!.includes(w.partOfSpeech));
  }
  return words;
}

function applyModeFilter(words: Word[], mode: QuizMode): Word[] {
  if (mode === 'base_to_comparative') {
    return words.filter(w =>
      w.conjugations.some(c => c.type === 'comparative' || c.type === 'superlative')
    );
  }
  const config = QUIZ_MODE_CONFIGS.find(c => c.mode === mode);
  if (config?.requiredConjugationType) {
    return words.filter(w =>
      w.conjugations.some(c => c.type === config.requiredConjugationType)
    );
  }
  return words;
}

export class QuizGenerationService {
  async createSession(
    mode: QuizMode,
    filter: WordFilter,
    wordCount = 10
  ): Promise<QuizSession> {
    const db = await getDatabase();
    const repo = new WordRepository(db);

    const candidates = applyModeFilter(await loadCandidates(repo, filter), mode);
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
    const candidates = applyModeFilter(await loadCandidates(repo, filter), mode);
    return candidates.length;
  }
}

export const quizGenerationService = new QuizGenerationService();
