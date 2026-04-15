import { ConjugationType, PartOfSpeech } from '@/types';

// en-inflectors provides English word inflection
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Inflectors } = require('en-inflectors');

export interface ConjugationEntry {
  type: ConjugationType;
  form: string;
}

export function generateConjugations(
  word: string,
  partOfSpeech: PartOfSpeech
): ConjugationEntry[] {
  const results: ConjugationEntry[] = [];

  try {
    const inflector = new Inflectors(word);

    if (partOfSpeech === 'verb') {
      const past = inflector.toPast();
      if (past && past !== word) results.push({ type: 'past_tense', form: past });

      const pastParticiple = inflector.toPastParticiple?.();
      if (pastParticiple && pastParticiple !== word && pastParticiple !== past) {
        results.push({ type: 'past_participle', form: pastParticiple });
      }

      const presentParticiple = inflector.toPresent?.('third')
        ? undefined
        : inflector.toPresentParticiple?.();
      if (presentParticiple && presentParticiple !== word) {
        results.push({ type: 'present_participle', form: presentParticiple });
      } else {
        // Fallback: manual -ing rule
        const ingForm = toGerund(word);
        if (ingForm !== word) results.push({ type: 'present_participle', form: ingForm });
      }

      const thirdPerson = inflector.toPresent?.('third') ?? toThirdPerson(word);
      if (thirdPerson && thirdPerson !== word) {
        results.push({ type: 'third_person_singular', form: thirdPerson });
      }
    } else if (partOfSpeech === 'noun') {
      const plural = inflector.toPlural?.();
      if (plural && plural !== word) results.push({ type: 'plural', form: plural });
    } else if (partOfSpeech === 'adjective' || partOfSpeech === 'adverb') {
      const comparative = inflector.toComparative?.();
      if (comparative && comparative !== word) {
        results.push({ type: 'comparative', form: comparative });
      }
      const superlative = inflector.toSuperlative?.();
      if (superlative && superlative !== word) {
        results.push({ type: 'superlative', form: superlative });
      }
    }
  } catch {
    // If en-inflectors fails, return empty (word still gets registered without conjugations)
  }

  return results;
}

function toGerund(verb: string): string {
  if (verb.endsWith('ie')) return verb.slice(0, -2) + 'ying';
  if (verb.endsWith('e') && !verb.endsWith('ee') && !verb.endsWith('oe')) {
    return verb.slice(0, -1) + 'ing';
  }
  // CVC doubling rule (basic)
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
  if (
    verb.endsWith('s') ||
    verb.endsWith('sh') ||
    verb.endsWith('ch') ||
    verb.endsWith('x') ||
    verb.endsWith('z') ||
    verb.endsWith('o')
  ) {
    return verb + 'es';
  }
  if (verb.endsWith('y') && !'aeiou'.includes(verb[verb.length - 2])) {
    return verb.slice(0, -1) + 'ies';
  }
  return verb + 's';
}
