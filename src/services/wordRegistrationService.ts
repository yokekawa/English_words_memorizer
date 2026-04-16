import { lookupWord } from '@/api/dictionary/freeDictionaryClient';
import { translateToJapanese } from '@/api/translation/myMemoryClient';
import { generateConjugations, lemmatize } from '@/api/conjugation/inflectorsService';
import { WordRepository } from '@/database/repositories/wordRepository';
import { Word, WordDraft } from '@/types';
import { getDatabase } from '@/database/db';

export class WordRegistrationService {
  async buildDraft(word: string): Promise<WordDraft> {
    const rawWord = word.trim().toLowerCase();

    // Step 1: Lemmatize locally (using → use, ran → run, studies → study, mice → mouse)
    const lemma = lemmatize(rawWord);

    // Step 2: Look up lemma in dictionary + translate in parallel
    const [dictResult, japaneseResult] = await Promise.allSettled([
      lookupWord(lemma),
      translateToJapanese(lemma),
    ]);

    const dictData =
      dictResult.status === 'fulfilled'
        ? dictResult.value
        : { baseForm: lemma, phonetic: null, partOfSpeech: 'unknown' as const };

    // Step 3: Use the dictionary's canonical form if it differs (e.g. API normalizes casing)
    const baseForm = dictData.baseForm || lemma;

    const japaneseMeaning =
      japaneseResult.status === 'fulfilled'
        ? japaneseResult.value
        : '(要確認)';

    // Step 4: Generate conjugations for the true base form
    const conjugations = generateConjugations(baseForm, dictData.partOfSpeech);

    return {
      baseForm,
      partOfSpeech: dictData.partOfSpeech,
      phonetic: dictData.phonetic,
      japaneseMeaning,
      exampleSentence: 'exampleSentence' in dictData ? dictData.exampleSentence : undefined,
      conjugations,
    };
  }

  async registerWord(draft: WordDraft): Promise<Word> {
    const db = await getDatabase();
    const repo = new WordRepository(db);
    return repo.insert(draft);
  }

  async isAlreadyRegistered(word: string): Promise<boolean> {
    const db = await getDatabase();
    const repo = new WordRepository(db);
    // Check both the raw word and its lemma to avoid duplicates
    const rawWord = word.trim().toLowerCase();
    const lemma = lemmatize(rawWord);
    const existing =
      (await repo.findByBaseForm(lemma)) ?? (await repo.findByBaseForm(rawWord));
    return existing !== null;
  }
}

export const wordRegistrationService = new WordRegistrationService();
