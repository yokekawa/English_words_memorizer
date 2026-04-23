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
  let anySensePosMatch = false;

  entry.senses.forEach((sense, i) => {
    const tagsJoined = (sense.tags ?? []).join(' ').toLowerCase();
    const posJoined = sense.parts_of_speech.join(' ').toLowerCase();
    const combined = `${posJoined} ${tagsJoined}`;

    let score = 0;
    if (matchesPos(sense.parts_of_speech, targetPos)) {
      score += 100;
      anySensePosMatch = true;
    }
    if (definitionMatchesWord(sense.english_definitions, word)) score += 50;
    score -= i * 2;

    if (targetPos === 'verb') {
      if (/ichidan|godan/.test(posJoined)) score += 10;
      if (/suru verb/.test(posJoined)) score += 5;
    }

    // Penalize obscure / archaic / humble / honorific / dated senses so common
    // everyday meanings win for learner-oriented translation.
    if (/\barchaic\b|\bdated\b|\bobsolete\b/.test(combined)) score -= 150;
    if (/\bobscure\b|\brare\b/.test(combined)) score -= 120;
    if (/\bhumble\b|\bhonorific\b|\bpolite\b/.test(combined)) score -= 80;
    if (/\bderogatory\b|\bvulgar\b|\bslang\b/.test(combined)) score -= 60;

    if (score > bestScore) {
      bestScore = score;
      bestSense = i;
    }
  });

  // Hard exclude entries whose senses never match the target POS at all.
  if (!anySensePosMatch) return { score: -Infinity, senseIndex: 0 };

  // Common-word bonus dominates so JMdict-marked common entries win unless
  // a non-common entry has very strong POS+definition match.
  if (entry.is_common) bestScore += 200;

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
  // Jisho's search ranks by reading/romaji match first, which surfaces junk
  // like 度 (reading "do") ahead of する for a bare "do" query. For verbs we
  // force a quoted English-definition search ("to do") first; if that fails
  // to produce a POS-matching result, fall back to the plain keyword.
  const queries =
    partOfSpeech === 'verb'
      ? [`"to ${word}"`, word]
      : [word];

  let bestOverall:
    | { entry: JishoEntry; senseIndex: number; score: number }
    | null = null;
  let firstResponseData: JishoEntry[] = [];

  for (const q of queries) {
    const url = `${BASE_URL}?keyword=${encodeURIComponent(q)}`;
    const response = await fetch(url);
    if (!response.ok) continue;
    const data: JishoResponse = await response.json();
    const entries = data.data ?? [];
    if (entries.length === 0) continue;
    if (firstResponseData.length === 0) firstResponseData = entries;

    for (const entry of entries) {
      const { score, senseIndex } = scoreEntry(entry, partOfSpeech, word);
      if (!bestOverall || score > bestOverall.score) {
        bestOverall = { entry, senseIndex, score };
      }
    }

    // If this query already found a POS-matching result, don't keep querying.
    if (bestOverall && bestOverall.score > -Infinity) break;
  }

  if (!bestOverall) {
    throw new Error('Jisho: no entries');
  }

  // Fallback: if no entry has any sense matching the target POS, pick the
  // first common entry (or first overall) so we still return something.
  if (bestOverall.score === -Infinity) {
    const fallback =
      firstResponseData.find(e => e.is_common) ?? firstResponseData[0];
    if (!fallback) throw new Error('Jisho: no usable entry');
    bestOverall = { entry: fallback, senseIndex: 0, score: 0 };
  }

  if (!bestOverall.entry.japanese[0]) {
    throw new Error('Jisho: no usable entry');
  }

  const translated = formatJapanese(
    bestOverall.entry,
    bestOverall.senseIndex,
    partOfSpeech
  );
  if (!translated) throw new Error('Jisho: empty translation');
  return translated;
}
