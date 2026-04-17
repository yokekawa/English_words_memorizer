import { QuizMode, WordFilter } from './quiz.types';
import { WordDraft, PartOfSpeech } from './word.types';

export type RegistrationStackParams = {
  Camera: undefined;
  OCRReview: { imageUri: string; rawText: string; blocks: TextBlock[] };
  WordDetail: { wordDraft: WordDraft };
};

export interface WordSelectionResult {
  selectedIds: number[];
  useDateFilter: boolean;
  fromIso: string;
  toIso: string;
  posFilter: PartOfSpeech[];
}

export type StudyStackParams = {
  StudyHome: { result?: WordSelectionResult } | undefined;
  WordSelection: {
    initialSelectedIds: number[];
    initialUseDateFilter: boolean;
    initialFromIso: string;
    initialToIso: string;
    initialPosFilter: PartOfSpeech[];
  };
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
