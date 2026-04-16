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
  baseForm: string;
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

// Prioritise the most educationally useful POS when a word has multiple.
// Verb first so learners practice conjugations; conjunction/preposition before noun
// because words like "and"/"in" are wrongly listed as nouns by some API entries.
const POS_PRIORITY: PartOfSpeech[] = [
  'verb', 'conjunction', 'preposition', 'pronoun',
  'adjective', 'adverb', 'noun', 'interjection',
];

export async function lookupWord(word: string): Promise<DictionaryResult> {
  const url = `${BASE_URL}/${encodeURIComponent(word.toLowerCase())}`;
  const response = await fetch(url);

  if (response.status === 404) {
    return { baseForm: word, phonetic: null, partOfSpeech: 'unknown' };
  }
  if (!response.ok) {
    throw new Error(`Dictionary API エラー: ${response.status}`);
  }

  const entries: DictionaryApiEntry[] = await response.json();
  const entry = entries[0];
  if (!entry) return { baseForm: word, phonetic: null, partOfSpeech: 'unknown' };

  // Pick best phonetic: prefer one with audio
  const phoneticWithAudio = entry.phonetics.find(p => p.text && p.audio);
  const phoneticWithText = entry.phonetics.find(p => p.text);
  const bestPhonetic = phoneticWithAudio ?? phoneticWithText;

  const phonetic: Phonetic | null = bestPhonetic?.text
    ? { text: bestPhonetic.text, audioUrl: bestPhonetic.audio || undefined }
    : null;

  // Collect all POS present in the API response, then pick by priority
  const allPos = entry.meanings.map(m => POS_MAP[m.partOfSpeech]).filter(Boolean) as PartOfSpeech[];
  const partOfSpeech = POS_PRIORITY.find(p => allPos.includes(p)) ?? 'unknown';

  // Use the meaning that matches the chosen POS for the example sentence
  const chosenMeaning =
    entry.meanings.find(m => (POS_MAP[m.partOfSpeech] ?? 'unknown') === partOfSpeech)
    ?? entry.meanings[0];
  const exampleSentence = chosenMeaning?.definitions.find(d => d.example)?.example;

  return { baseForm: entry.word.toLowerCase(), phonetic, partOfSpeech, exampleSentence };
}
