import { lookupWord } from '@/api/dictionary/freeDictionaryClient';
import { translateToJapanese } from '@/api/translation/myMemoryClient';
import { generateConjugations } from '@/api/conjugation/inflectorsService';
import { WordRepository } from '@/database/repositories/wordRepository';
import { Word, WordDraft } from '@/types';
import { getDatabase } from '@/database/db';

export class WordRegistrationService {
  async buildDraft(word: string): Promise<WordDraft> {
    const cleanWord = word.trim().toLowerCase();

    // Run dictionary lookup and translation in parallel
    const [dictResult, japaneseResult] = await Promise.allSettled([
      lookupWord(cleanWord),
      translateToJapanese(cleanWord),
    ]);

    const dictData =
      dictResult.status === 'fulfilled'
        ? dictResult.value
        : { phonetic: null, partOfSpeech: 'unknown' as const };

    const japaneseMeaning =
      japaneseResult.status === 'fulfilled'
        ? japaneseResult.value
        : `(${cleanWord})`;

    // Generate conjugations locally (no network needed)
    const conjugations = generateConjugations(cleanWord, dictData.partOfSpeech);

    return {
      baseForm: cleanWord,
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
    const existing = await repo.findByBaseForm(word.trim().toLowerCase());
    return existing !== null;
  }
}

export const wordRegistrationService = new WordRegistrationService();
