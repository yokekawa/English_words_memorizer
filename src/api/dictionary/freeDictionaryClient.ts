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

  // Pick the POS with the most definitions — more definitions = primary usage.
  // This correctly resolves "do/go/have" (verb-heavy) vs "web" (noun-heavy).
  const posScores = new Map<PartOfSpeech, number>();
  for (const meaning of entry.meanings) {
    const pos = POS_MAP[meaning.partOfSpeech];
    if (pos) posScores.set(pos, (posScores.get(pos) ?? 0) + meaning.definitions.length);
  }
  let partOfSpeech: PartOfSpeech = 'unknown';
  let maxScore = 0;
  for (const [pos, score] of posScores) {
    if (score > maxScore) { maxScore = score; partOfSpeech = pos; }
  }

  const chosenMeaning =
    entry.meanings.find(m => (POS_MAP[m.partOfSpeech] ?? 'unknown') === partOfSpeech)
    ?? entry.meanings[0];
  const exampleSentence = chosenMeaning?.definitions.find(d => d.example)?.example;

  return { baseForm: entry.word.toLowerCase(), phonetic, partOfSpeech, exampleSentence };
}
