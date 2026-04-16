import { WordFilter } from './quiz.types';

export interface SavedRange {
  id: number;
  name: string;
  filter: WordFilter;
  createdAt: string;
}
