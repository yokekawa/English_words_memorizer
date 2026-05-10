import { PartOfSpeech } from '@/types';

const BASE_URL = 'https://jisho.org/api/v1/search/words';

/**
 * Curated override for basic high-frequency verbs where Jisho's keyword search
 * surfaces valid-but-non-canonical forms (e.g. 遣る or 執り行う instead of する).
 * Only applied when the target POS is verb.
 */
const COMMON_VERB_OVERRIDES: Record<string, string> = {
  do:     'する',
  come:   '来る',
  go:     '行く',
  get:    '得る',
  give:   '与える',
  take:   '取る',
  make:   '作る',
  see:    '見る',
  look:   '見る',
  know:   '知る',
  think:  '思う',
  say:    '言う',
  tell:   '伝える',
  ask:    '尋ねる',
  find:   '見つける',
  become: 'なる',
  leave:  '去る',
  feel:   '感じる',
  try:    '試す',
  use:    '使う',
  work:   '働く',
  eat:    '食べる',
  drink:  '飲む',
  run:    '走る',
  walk:   '歩く',
  sit:    '座る',
  stand:  '立つ',
  sleep:  '寝る',
  read:   '読む',
  write:  '書く',
  speak:  '話す',
  hear:   '聞く',
  listen: '聞く',
  want:   '欲しい',
  like:   '好む',
  love:   '愛する',
  live:   '住む',
  die:    '死ぬ',
  put:    '置く',
  hold:   '持つ',
  keep:   '保つ',
  wait:   '待つ',
  start:  '始める',
  stop:   '止める',
  open:   '開ける',
  close:  '閉める',
  buy:    '買う',
  sell:   '売る',
  learn:  '学ぶ',
  teach:  '教える',
  help:   '助ける',
};

interface JishoJapanese {
  word?: string;
  reading?: string;
}

interface JishoSense {
  english_definitions: string[];
  parts_of_speech: string[];
  tags?: string[];
  info?: string[];
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
    case 'auxiliary':
      // JMdict tags Japanese auxiliary verbs as "auxiliary verb" / "aux-v";
      // English modals don't have a clean Japanese equivalent, but the closest
      // matches are still in this tagged subset.
      return /auxiliary|\baux-v\b|\baux\b/.test(joined);
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
    case 'determiner':
      // Jisho/JMdict doesn't have a "determiner" POS tag — treat as no match
      // and fall back to is_common scoring; almost no English determiner has
      // a meaningful Japanese single-word translation anyway.
      return /determiner|article/.test(joined);
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

function isUsuallyKana(sense: JishoSense | undefined): boolean {
  if (!sense) return false;
  const all = [
    ...(sense.parts_of_speech ?? []),
    ...(sense.tags ?? []),
  ]
    .join(' ')
    .toLowerCase();
  // JMdict's "uk" / "Usually written using kana alone" indicator surfaces in
  // various forms across Jisho's API; match all of them.
  return /usually written using kana|usu\.\s*kana|\buk\b/.test(all);
}

function formatJapanese(
  entry: JishoEntry,
  senseIndex: number,
  targetPos: PartOfSpeech
): string {
  const first = entry.japanese[0];
  if (!first) return '';

  const sense = entry.senses[senseIndex];
  // For senses tagged "usually kana", the kanji form is rare/unnatural
  // (e.g. やる written as 遣る). Prefer the kana reading in that case.
  const preferKana = isUsuallyKana(sense) && !!first.reading;
  const base = preferKana
    ? (first.reading as string)
    : (first.word ?? first.reading ?? '');
  if (!base) return '';

  if (targetPos === 'verb') {
    const poses = sense?.parts_of_speech ?? [];
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
    const infoJoined = (sense.info ?? []).join(' ').toLowerCase();
    const combined = `${posJoined} ${tagsJoined} ${infoJoined}`;

    let score = 0;
    if (matchesPos(sense.parts_of_speech, targetPos)) {
      score += 100;
      anySensePosMatch = true;
    }
    if (definitionMatchesWord(sense.english_definitions, word)) score += 50;
    score -= i * 2;

    if (targetPos === 'verb') {
      // Small bonuses; previously godan got +10 which let colloquial verbs
      // like 遣る beat the canonical suru verb する. Keep them low and roughly
      // balanced so common-word + exact-def-match dominates.
      if (/ichidan|godan/.test(posJoined)) score += 3;
      if (/suru verb/.test(posJoined)) score += 3;
    }

    // Penalize obscure / archaic / humble / honorific / dated senses so common
    // everyday meanings win for learner-oriented translation.
    if (/\barchaic\b|\bdated\b|\bobsolete\b/.test(combined)) score -= 150;
    if (/\bobscure\b|\brare\b/.test(combined)) score -= 120;
    if (/\bhumble\b|\bhonorific\b|\bpolite\b/.test(combined)) score -= 80;
    if (/\bderogatory\b|\bvulgar\b|\bslang\b/.test(combined)) score -= 60;
    // "Usu. in compounds" / "esp. in compounds" entries (e.g. 中華 for "China")
    // are valid but read as parts of compound words, not as the standalone
    // translation a learner expects from a single keyword. Push them down
    // hard so the standalone form (e.g. 中国) wins.
    if (/\bin compounds?\b|\bcompound\s*word/.test(combined)) score -= 100;

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
  const lower = word.toLowerCase();

  // Curated override: top-frequency verbs where Jisho's ranking is unreliable.
  if (partOfSpeech === 'verb') {
    const override = COMMON_VERB_OVERRIDES[lower];
    if (override) return override;
  }

  // Jisho ranks by both English definitions and Japanese reading romaji,
  // which is why bare 'china' surfaces 地内 (chinai) and bare 'be' surfaces
  // 弁当 (bento) — the romaji-prefix match wins. Wrapping the word in
  // double quotes constrains Jisho to exact English-definition matching,
  // which excludes romaji collisions entirely.
  // We try quoted forms first and only fall back to the bare keyword if
  // nothing usable comes back, so rare words still resolve.
  const queries =
    partOfSpeech === 'verb'
      ? [`"to ${word}"`, `"${word}"`, word]
      : [`"${word}"`, word];

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

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const { score, senseIndex } = scoreEntry(entry, partOfSpeech, word);
      // Slight preference for earlier entries, so Jisho's own ranking acts
      // as a tie-breaker when multiple entries have the same common-POS score.
      const adjusted = score === -Infinity ? score : score - i * 3;
      if (!bestOverall || adjusted > bestOverall.score) {
        bestOverall = { entry, senseIndex, score: adjusted };
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
