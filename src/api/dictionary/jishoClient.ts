import { PartOfSpeech } from '@/types';

const BASE_URL = 'https://jisho.org/api/v1/search/words';

interface JishoJapanese {
  word?: string;
  reading?: string;
}

interface JishoSense {
  english_definitions: string[];
  parts_of_speech: string[];
  tags?: string[];
}

interface JishoEntry {
  slug: string;
  is_common?: boolean;
  japanese: JishoJapanese[];
  senses: JishoSense[];
}

interface JishoResponse {
  data: JishoEntry[];
}

function matchesPos(jishoPoses: string[], target: PartOfSpeech): boolean {
  const joined = jishoPoses.join(' ').toLowerCase();
  switch (target) {
    case 'verb':
      return /\bverb\b|ichidan|godan|kuru verb|suru verb/.test(joined);
    case 'noun':
      return /\bnoun\b/.test(joined);
    case 'adjective':
      return /adjective/.test(joined);
    case 'adverb':
      return /adverb/.test(joined);
    case 'pronoun':
      return /pronoun/.test(joined);
    case 'preposition':
      return /prefix|preposition/.test(joined);
    case 'conjunction':
      return /conjunction/.test(joined);
    case 'interjection':
      return /interjection/.test(joined);
    default:
      return false;
  }
}

function definitionMatchesWord(defs: string[], word: string): boolean {
  const lower = word.toLowerCase();
  return defs.some(d => {
    const normalised = d.toLowerCase().replace(/^to\s+/, '').trim();
    return normalised === lower;
  });
}

function formatJapanese(
  entry: JishoEntry,
  senseIndex: number,
  targetPos: PartOfSpeech
): string {
  const first = entry.japanese[0];
  const base = first?.word ?? first?.reading ?? '';
  if (!base) return '';

  if (targetPos === 'verb') {
    const poses = entry.senses[senseIndex]?.parts_of_speech ?? [];
    const isSuruVerb = poses.some(p => /suru verb/i.test(p));
    if (isSuruVerb && !/する$/.test(base)) return base + 'する';
  }
  return base;
}

/**
 * Score an entry for a given target POS.
 * Higher is better.
 */
function scoreEntry(
  entry: JishoEntry,
  targetPos: PartOfSpeech,
  word: string
): { score: number; senseIndex: number } {
  let bestSense = -1;
  let bestScore = -Infinity;

  entry.senses.forEach((sense, i) => {
    let score = 0;
    if (matchesPos(sense.parts_of_speech, targetPos)) score += 100;
    if (definitionMatchesWord(sense.english_definitions, word)) score += 50;
    // Earlier senses are usually more common meanings
    score -= i * 2;
    // Prefer Ichidan/Godan (pure verb) over Suru verb for verbs
    if (targetPos === 'verb') {
      const joined = sense.parts_of_speech.join(' ').toLowerCase();
      if (/ichidan|godan/.test(joined)) score += 10;
      if (/suru verb/.test(joined)) score += 5;
    }
    if (score > bestScore) {
      bestScore = score;
      bestSense = i;
    }
  });

  // Common word bonus applies to the whole entry
  if (entry.is_common) bestScore += 30;

  return { score: bestScore, senseIndex: Math.max(0, bestSense) };
}

/**
 * Get the best Japanese translation for an English word using Jisho (JMdict).
 * Throws if no usable entry is found.
 */
export async function translateToJapanese(
  word: string,
  partOfSpeech: PartOfSpeech
): Promise<string> {
  const url = `${BASE_URL}?keyword=${encodeURIComponent(word)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Jisho API エラー: ${response.status}`);
  }

  const data: JishoResponse = await response.json();
  if (!data.data || data.data.length === 0) {
    throw new Error('Jisho: no entries');
  }

  let best: { entry: JishoEntry; senseIndex: number; score: number } | null = null;
  for (const entry of data.data) {
    const { score, senseIndex } = scoreEntry(entry, partOfSpeech, word);
    if (!best || score > best.score) {
      best = { entry, senseIndex, score };
    }
  }

  if (!best || !best.entry.japanese[0]) {
    throw new Error('Jisho: no usable entry');
  }

  const translated = formatJapanese(best.entry, best.senseIndex, partOfSpeech);
  if (!translated) throw new Error('Jisho: empty translation');
  return translated;
}
