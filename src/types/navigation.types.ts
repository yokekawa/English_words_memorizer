import { QuizMode, WordFilter } from './quiz.types';
import { WordDraft } from './word.types';

export type RegistrationStackParams = {
  Camera: undefined;
  OCRReview: { imageUri: string; rawText: string; blocks: TextBlock[] };
  WordDetail: { wordDraft: WordDraft };
};

export type StudyStackParams = {
  StudyHome: undefined;
  Quiz: { sessionId: string };
  Result: { sessionId: string };
};

export type WordListStackParams = {
  WordList: undefined;
  WordEdit: { wordId: number };
};

export type RootTabParams = {
  Registration: undefined;
  Study: undefined;
  WordList: undefined;
  Settings: undefined;
};

export interface TextBlock {
  text: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
