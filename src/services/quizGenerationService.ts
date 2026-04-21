import { WordRepository } from '@/database/repositories/wordRepository';
import { getDatabase } from '@/database/db';
import { QuizMode, QuizQuestion, QuizSession, WordFilter, Word } from '@/types';
import { getQuizModeConfig } from '@/constants/quizModes';

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function findConjs(word: Word, type: string): string[] {
  return word.conjugations.filter(c => c.type === type).map(c => c.form);
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
      const pasts = findConjs(word, 'past_tense');
      if (pasts.length === 0) return null;
      return {
        id: makeId(),
        wordId: word.id,
        mode,
        prompt: `${word.baseForm}  ―  過去形は？`,
        correctAnswer: pasts[0],
        acceptableAnswers: pasts,
      };
    }

    case 'base_to_past_participle': {
      const pps = findConjs(word, 'past_participle');
      if (pps.length === 0) return null;
      return {
        id: makeId(),
        wordId: word.id,
        mode,
        prompt: `${word.baseForm}  ―  過去分詞形は？`,
        correctAnswer: pps[0],
        acceptableAnswers: pps,
      };
    }

    case 'base_to_past_both': {
      const pasts = findConjs(word, 'past_tense');
      const pps = findConjs(word, 'past_participle');
      if (pasts.length === 0 || pps.length === 0) return null;
      return {
        id: makeId(),
        wordId: word.id,
        mode,
        prompt: `${word.baseForm}  ―  過去形と過去分詞形は？`,
        correctAnswer: pasts[0],
        correctAnswer2: pps[0],
        acceptableAnswers: pasts,
        acceptableAnswers2: pps,
        label1: '過去形',
        label2: '過去分詞形',
      };
    }

    case 'base_to_plural': {
      const pls = findConjs(word, 'plural');
      if (pls.length === 0) return null;
      return {
        id: makeId(),
        wordId: word.id,
        mode,
        prompt: `${word.baseForm}  ―  複数形は？`,
        correctAnswer: pls[0],
        acceptableAnswers: pls,
      };
    }

    case 'base_to_comparative': {
      const cs = findConjs(word, 'comparative');
      if (cs.length === 0) return null;
      return {
        id: makeId(),
        wordId: word.id,
        mode,
        prompt: `${word.baseForm}  ―  比較級は？`,
        correctAnswer: cs[0],
        acceptableAnswers: cs,
      };
    }

    case 'base_to_superlative': {
      const ss = findConjs(word, 'superlative');
      if (ss.length === 0) return null;
      return {
        id: makeId(),
        wordId: word.id,
        mode,
        prompt: `${word.baseForm}  ―  最上級は？`,
        correctAnswer: ss[0],
        acceptableAnswers: ss,
      };
    }

    case 'base_to_comparative_both': {
      const cs = findConjs(word, 'comparative');
      const ss = findConjs(word, 'superlative');
      if (cs.length === 0 || ss.length === 0) return null;
      return {
        id: makeId(),
        wordId: word.id,
        mode,
        prompt: `${word.baseForm}  ―  比較級と最上級は？`,
        correctAnswer: cs[0],
        correctAnswer2: ss[0],
        acceptableAnswers: cs,
        acceptableAnswers2: ss,
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
