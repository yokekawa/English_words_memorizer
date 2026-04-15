import { create } from 'zustand';
import { Word, WordDraft } from '@/types';
import { getDatabase } from '@/database/db';
import { WordRepository } from '@/database/repositories/wordRepository';

interface WordState {
  words: Word[];
  isLoading: boolean;
  error: string | null;
  loadWords: () => Promise<void>;
  addWord: (word: Word) => void;
  updateWord: (id: number, updates: Partial<WordDraft>) => Promise<void>;
  deleteWord: (id: number) => Promise<void>;
  refreshWord: (id: number) => Promise<void>;
}

export const useWordStore = create<WordState>((set, get) => ({
  words: [],
  isLoading: false,
  error: null,

  loadWords: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = await getDatabase();
      const repo = new WordRepository(db);
      const words = await repo.findAll();
      set({ words, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  addWord: (word: Word) => {
    set(state => ({ words: [word, ...state.words] }));
  },

  updateWord: async (id: number, updates: Partial<WordDraft>) => {
    const db = await getDatabase();
    const repo = new WordRepository(db);
    await repo.update(id, updates);
    await get().refreshWord(id);
  },

  deleteWord: async (id: number) => {
    const db = await getDatabase();
    const repo = new WordRepository(db);
    await repo.delete(id);
    set(state => ({ words: state.words.filter(w => w.id !== id) }));
  },

  refreshWord: async (id: number) => {
    const db = await getDatabase();
    const repo = new WordRepository(db);
    const updated = await repo.findById(id);
    if (updated) {
      set(state => ({
        words: state.words.map(w => (w.id === id ? updated : w)),
      }));
    }
  },
}));
