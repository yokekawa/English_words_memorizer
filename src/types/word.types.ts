export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'preposition'
  | 'conjunction'
  | 'interjection'
  | 'unknown';

export type ConjugationType =
  | 'past_tense'
  | 'past_participle'
  | 'present_participle'
  | 'third_person_singular'
  | 'plural'
  | 'comparative'
  | 'superlative';

export interface Phonetic {
  text: string;
  audioUrl?: string;
}

export interface Conjugation {
  id: number;
  wordId: number;
  type: ConjugationType;
  form: string;
}

export interface Word {
  id: number;
  baseForm: string;
  partOfSpeech: PartOfSpeech;
  phonetic: Phonetic | null;
  japaneseMeaning: string;
  exampleSentence?: string;
  conjugations: Conjugation[];
  timesCorrect: number;
  timesIncorrect: number;
  lastStudied: string | null;
  nextReview: string | null;
  createdAt: string;
}

export type WordDraft = {
  baseForm: string;
  partOfSpeech: PartOfSpeech;
  phonetic: Phonetic | null;
  japaneseMeaning: string;
  exampleSentence?: string;
  conjugations: Omit<Conjugation, 'id' | 'wordId'>[];
};
