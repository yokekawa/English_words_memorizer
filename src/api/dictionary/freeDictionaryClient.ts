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

/**
 * Free Dictionary occasionally returns IPA strings with non-canonical
 * characters that are visually broken in standard fonts. Map them back
 * to the canonical IPA codepoints used by Wiktionary.
 *
 *   ʉ U+0289 (barred U)  → ʊ U+028A (Latin upsilon)
 *     The barred U is a closed central rounded vowel that does not occur
 *     in standard English transcription; appearances of it (e.g. /gəʉ/
 *     for "go") are upstream typos for the near-close near-back rounded
 *     vowel ʊ.
 */
function normalizeIpa(text: string): string {
  return text.replace(/ʉ/g, 'ʊ');
}

/**
 * Score a phonetic candidate by IPA completeness. Strings with length
 * marks, stress marks and standard IPA vowels score higher than terse
 * approximations like "/sɑs/" that omit the long mark.
 */
function scoreIpa(text: string): number {
  let score = 0;
  if (/[ːˑ]/.test(text)) score += 3; // ː ˑ length marks
  if (/[ˈˌ]/.test(text)) score += 2; // ˈ ˌ stress marks
  if (/[ɔɛəɐ-ʯ]/.test(text)) score += 1; // any IPA char
  score += Math.min(text.length / 8, 1); // mild bonus for fuller transcriptions
  return score;
}

function pickBestPhonetic(
  phonetics: DictionaryApiPhonetic[]
): DictionaryApiPhonetic | undefined {
  const candidates = phonetics.filter(p => p.text);
  if (candidates.length === 0) return undefined;
  // IPA quality dominates; audio presence is a small tiebreaker so we
  // still prefer transcriptions that come paired with playable audio
  // when their IPA quality is comparable.
  const ranked = [...candidates].sort((a, b) => {
    const sa = scoreIpa(a.text!) + (a.audio ? 0.5 : 0);
    const sb = scoreIpa(b.text!) + (b.audio ? 0.5 : 0);
    return sb - sa;
  });
  return ranked[0];
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

  const bestPhonetic = pickBestPhonetic(entry.phonetics);

  const phonetic: Phonetic | null = bestPhonetic?.text
    ? { text: normalizeIpa(bestPhonetic.text), audioUrl: bestPhonetic.audio || undefined }
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
