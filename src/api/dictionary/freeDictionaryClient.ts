import { PartOfSpeech, Phonetic } from '@/types';

const BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

interface DictionaryApiPhonetic {
  text?: string;
  audio?: string;
}

interface DictionaryApiDefinition {
  definition: string;
  example?: string;
}

interface DictionaryApiMeaning {
  partOfSpeech: string;
  definitions: DictionaryApiDefinition[];
}

interface DictionaryApiEntry {
  word: string;
  phonetics: DictionaryApiPhonetic[];
  meanings: DictionaryApiMeaning[];
}

export interface DictionaryResult {
  phonetic: Phonetic | null;
  partOfSpeech: PartOfSpeech;
  exampleSentence?: string;
}

const POS_MAP: Record<string, PartOfSpeech> = {
  noun: 'noun',
  verb: 'verb',
  adjective: 'adjective',
  adverb: 'adverb',
  pronoun: 'pronoun',
  preposition: 'preposition',
  conjunction: 'conjunction',
  interjection: 'interjection',
};

export async function lookupWord(word: string): Promise<DictionaryResult> {
  const url = `${BASE_URL}/${encodeURIComponent(word.toLowerCase())}`;
  const response = await fetch(url);

  if (response.status === 404) {
    return { phonetic: null, partOfSpeech: 'unknown' };
  }
  if (!response.ok) {
    throw new Error(`Dictionary API エラー: ${response.status}`);
  }

  const entries: DictionaryApiEntry[] = await response.json();
  const entry = entries[0];
  if (!entry) return { phonetic: null, partOfSpeech: 'unknown' };

  // Pick best phonetic: prefer one with audio
  const phoneticWithAudio = entry.phonetics.find(p => p.text && p.audio);
  const phoneticWithText = entry.phonetics.find(p => p.text);
  const bestPhonetic = phoneticWithAudio ?? phoneticWithText;

  const phonetic: Phonetic | null = bestPhonetic?.text
    ? {
        text: bestPhonetic.text,
        audioUrl: bestPhonetic.audio || undefined,
      }
    : null;

  const firstMeaning = entry.meanings[0];
  const partOfSpeech: PartOfSpeech =
    POS_MAP[firstMeaning?.partOfSpeech ?? ''] ?? 'unknown';

  const exampleSentence = firstMeaning?.definitions.find(d => d.example)?.example;

  return { phonetic, partOfSpeech, exampleSentence };
}
