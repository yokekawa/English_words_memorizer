import { ConjugationType, PartOfSpeech } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Inflectors } = require('en-inflectors');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nlp = require('compromise');

export interface ConjugationEntry {
  type: ConjugationType;
  form: string;
}

// Irregular comparative/superlative → base form lookup
const IRREGULAR_ADJECTIVES: Record<string, string> = {
  better: 'good', best: 'good',
  worse: 'bad',   worst: 'bad',
  further: 'far', furthest: 'far',
  farther: 'far', farthest: 'far',
  elder: 'old',   eldest: 'old',
  less: 'little', least: 'little',
};

/**
 * Verbs with multiple accepted past / past-participle forms. Listed forms are
 * all registered so either is accepted in quizzes.
 */
const VERB_ALTERNATE_FORMS: Record<
  string,
  { past?: string[]; pastParticiple?: string[] }
> = {
  be: { past: ['was', 'were'], pastParticiple: ['been'] },
  dive: { past: ['dived', 'dove'] },
  dream: { past: ['dreamed', 'dreamt'], pastParticiple: ['dreamed', 'dreamt'] },
  learn: { past: ['learned', 'learnt'], pastParticiple: ['learned', 'learnt'] },
  burn: { past: ['burned', 'burnt'], pastParticiple: ['burned', 'burnt'] },
  spell: { past: ['spelled', 'spelt'], pastParticiple: ['spelled', 'spelt'] },
  smell: { past: ['smelled', 'smelt'], pastParticiple: ['smelled', 'smelt'] },
  spoil: { past: ['spoiled', 'spoilt'], pastParticiple: ['spoiled', 'spoilt'] },
  leap: { past: ['leaped', 'leapt'], pastParticiple: ['leaped', 'leapt'] },
};

/**
 * Given any inflected form, return the base/lemma form.
 * Covers verbs (using→use, ran→run), nouns (mice→mouse),
 * and adjectives (happier→happy, biggest→big, better→good).
 */
export function lemmatize(word: string): string {
  const w = word.toLowerCase();

  // Check irregular adjectives first
  if (IRREGULAR_ADJECTIVES[w]) return IRREGULAR_ADJECTIVES[w];

  // Present participle (-ing): try en-inflectors before compromise
  // compromise often fails to tag isolated gerunds (e.g. "using" → unchanged)
  if (w.endsWith('ing') && w.length > 4) {
    try {
      const base = new Inflectors(w).toPresent?.();
      if (base && base !== w) return base;
    } catch {}
  }

  try {
    const doc = nlp(w);

    // Verb: toInfinitive via compromise
    const verb = doc.verbs();
    if (verb.length > 0) {
      const inf = verb.toInfinitive?.()?.text?.();
      if (inf && inf !== w) return inf;
    }

    // Adjective comparative/superlative → derive base form
    const adj = doc.adjectives();
    if (adj.length > 0) {
      const adjJson = adj.json()[0];
      const tags: string[] = adjJson?.terms?.[0]?.tags ?? [];
      if (tags.includes('Comparative') || tags.includes('Superlative')) {
        // -ier / -iest → remove suffix and restore 'y'
        if (w.endsWith('ier'))  return w.slice(0, -3) + 'y';
        if (w.endsWith('iest')) return w.slice(0, -4) + 'y';
        // doubled-consonant -er / -est (bigger→big, biggest→big)
        if (w.endsWith('er')  && w.length > 4 && w[w.length - 3] === w[w.length - 4]) return w.slice(0, -3);
        if (w.endsWith('est') && w.length > 5 && w[w.length - 4] === w[w.length - 5]) return w.slice(0, -4);
        // plain -er / -est
        if (w.endsWith('er'))  return w.slice(0, -2);
        if (w.endsWith('est')) return w.slice(0, -3);
      }
    }

    // Noun plural → singular
    const noun = doc.nouns();
    if (noun.length > 0 && noun.isPlural?.().length > 0) {
      const sg = noun.toSingular?.()?.text?.();
      if (sg && sg !== w) return sg;
    }
  } catch {
    // fall through to en-inflectors fallback
  }

  // Fallback: en-inflectors verb/noun handling
  try {
    const inflector = new Inflectors(w);
    const present = inflector.toPresent?.();
    if (present && present !== w) return present;
    if (inflector.isPlural?.()) {
      const singular = inflector.toSingular?.();
      if (singular && singular !== w) return singular;
    }
  } catch { /* ignore */ }

  return w;
}

export function generateConjugations(
  word: string,
  partOfSpeech: PartOfSpeech
): ConjugationEntry[] {
  const results: ConjugationEntry[] = [];

  try {
    if (partOfSpeech === 'verb') {
      const inflector = new Inflectors(word);
      const alts = VERB_ALTERNATE_FORMS[word.toLowerCase()];

      // Always emit past / past_participle even when identical to the base
      // form (hit/hit/hit, cut/cut/cut), so quiz modes that require those
      // conjugations still include the verb. Alternate forms (be → was/were)
      // come from VERB_ALTERNATE_FORMS so the quiz accepts either.
      const pastForms = alts?.past ?? [inflector.toPast?.() || word];
      pastForms.forEach(p => results.push({ type: 'past_tense', form: p }));

      const ppForms =
        alts?.pastParticiple ??
        [inflector.toPastParticiple?.() || pastForms[0]];
      ppForms.forEach(p => results.push({ type: 'past_participle', form: p }));

      const ingForm = toGerund(word);
      if (ingForm !== word) results.push({ type: 'present_participle', form: ingForm });

      const thirdPerson = inflector.toPresent?.('third') ?? toThirdPerson(word);
      if (thirdPerson && thirdPerson !== word) {
        results.push({ type: 'third_person_singular', form: thirdPerson });
      }
    } else if (partOfSpeech === 'noun') {
      const inflector = new Inflectors(word);
      const plural = inflector.toPlural?.();
      if (plural && plural !== word) results.push({ type: 'plural', form: plural });
    } else if (partOfSpeech === 'adjective' || partOfSpeech === 'adverb') {
      // Use compromise for adjective comparative/superlative (handles irregular forms)
      const adjJson = nlp(word).adjectives().json()[0];
      const comparative = adjJson?.adjective?.comparative;
      const superlative = adjJson?.adjective?.superlative;
      if (comparative && comparative !== word) results.push({ type: 'comparative', form: comparative });
      if (superlative && superlative !== word) results.push({ type: 'superlative', form: superlative });
    }
  } catch {
    // word still gets registered without conjugations
  }

  return results;
}

function toGerund(verb: string): string {
  if (verb.endsWith('ie')) return verb.slice(0, -2) + 'ying';
  if (verb.endsWith('e') && !verb.endsWith('ee') && !verb.endsWith('oe')) {
    return verb.slice(0, -1) + 'ing';
  }
  const vowels = 'aeiou';
  if (
    verb.length >= 3 &&
    !vowels.includes(verb[verb.length - 1]) &&
    vowels.includes(verb[verb.length - 2]) &&
    !vowels.includes(verb[verb.length - 3])
  ) {
    return verb + verb[verb.length - 1] + 'ing';
  }
  return verb + 'ing';
}

function toThirdPerson(verb: string): string {
  if (verb.endsWith('s') || verb.endsWith('sh') || verb.endsWith('ch') ||
      verb.endsWith('x') || verb.endsWith('z') || verb.endsWith('o')) {
    return verb + 'es';
  }
  if (verb.endsWith('y') && !'aeiou'.includes(verb[verb.length - 2])) {
    return verb.slice(0, -1) + 'ies';
  }
  return verb + 's';
}
