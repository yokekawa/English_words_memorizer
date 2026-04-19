import { WordRepository } from '@/database/repositories/wordRepository';
import { getDatabase } from '@/database/db';
import { QuizMode, QuizQuestion, QuizSession, WordFilter, Word } from '@/types';
import { getQuizModeConfig } from '@/constants/quizModes';

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function findConj(word: Word, type: string): string | undefined {
  return word.conjugations.find(c => c.type === type)?.form;
}

function buildQuestion(word: Word, mode: QuizMode): QuizQuestion | null {
  switch (mode) {
    case 'jp_to_en':
      return {
        id: makeId(),
        wordId: word.id,
        mode,
        prompt: word.japaneseMeaning,
        correctAnswer: word.baseForm,
      };

    case 'audio_to_en': {
      const phoneticText = word.phonetic?.text ?? '';
      const audioUrl = word.phonetic?.audioUrl;
      if (!phoneticText && !audioUrl) return null;
      return {
        id: makeId(),
        wordId: word.id,
        mode,
        prompt: phoneticText || '(音声のみ)',
        correctAnswer: word.baseForm,
        audioUrl,
      };
    }

    case 'base_to_past': {
      const past = findConj(word, 'past_tense');
      if (!past) return null;
      return {
        id: makeId(),
        wordId: word.id,
        mode,
        prompt: `${word.baseForm}  ―  過去形は？`,
        correctAnswer: past,
      };
    }

    case 'base_to_past_participle': {
      const pp = findConj(word, 'past_participle');
      if (!pp) return null;
      return {
        id: makeId(),
        wordId: word.id,
        mode,
        prompt: `${word.baseForm}  ―  過去分詞形は？`,
        correctAnswer: pp,
      };
    }

    case 'base_to_past_both': {
      const past = findConj(word, 'past_tense');
      const pp = findConj(word, 'past_participle');
      if (!past || !pp) return null;
      return {
        id: makeId(),
        wordId: word.id,
        mode,
        prompt: `${word.baseForm}  ―  過去形と過去分詞形は？`,
        correctAnswer: past,
        correctAnswer2: pp,
        label1: '過去形',
        label2: '過去分詞形',
      };
    }

    case 'base_to_plural': {
      const pl = findConj(word, 'plural');
      if (!pl) return null;
      return {
        id: makeId(),
        wordId: word.id,
        mode,
        prompt: `${word.baseForm}  ―  複数形は？`,
        correctAnswer: pl,
      };
    }

    case 'base_to_comparative': {
      const c = findConj(word, 'comparative');
      if (!c) return null;
      return {
        id: makeId(),
        wordId: word.id,
        mode,
        prompt: `${word.baseForm}  ―  比較級は？`,
        correctAnswer: c,
      };
    }

    case 'base_to_superlative': {
      const s = findConj(word, 'superlative');
      if (!s) return null;
      return {
        id: makeId(),
        wordId: word.id,
        mode,
        prompt: `${word.baseForm}  ―  最上級は？`,
        correctAnswer: s,
      };
    }

    case 'base_to_comparative_both': {
      const c = findConj(word, 'comparative');
      const s = findConj(word, 'superlative');
      if (!c || !s) return null;
      return {
        id: makeId(),
        wordId: word.id,
        mode,
        prompt: `${word.baseForm}  ―  比較級と最上級は？`,
        correctAnswer: c,
        correctAnswer2: s,
        label1: '比較級',
        label2: '最上級',
      };
    }
  }
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
  if (mode === 'jp_to_en') return words;
  if (mode === 'audio_to_en') {
    return words.filter(w => (w.phonetic?.text || w.phonetic?.audioUrl));
  }
  const config = getQuizModeConfig(mode);
  const required = config.requiredConjugationTypes ?? [];
  if (required.length === 0) return words;
  return words.filter(w => required.every(t => w.conjugations.some(c => c.type === t)));
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
