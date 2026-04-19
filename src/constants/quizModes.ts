import { QuizMode } from '@/types';
import { Colors } from './colors';

export interface QuizModeConfig {
  mode: QuizMode;
  label: string;
  description: string;
  icon: string;
  color: string;
  requiredPartOfSpeech?: string[];
  /** Conjugation types the word must have to be included in this mode. */
  requiredConjugationTypes?: string[];
  /** If true, questions in this mode expect two answers from the user. */
  dualAnswer?: boolean;
}

export const QUIZ_MODE_CONFIGS: QuizModeConfig[] = [
  {
    mode: 'jp_to_en',
    label: '日本語→英語',
    description: '日本語の意味から英単語を入力',
    icon: '🇯🇵',
    color: Colors.quizMode.jpToEn,
  },
  {
    mode: 'audio_to_en',
    label: '発音→英語',
    description: '発音を聞いて/見て英単語を入力',
    icon: '🔊',
    color: Colors.quizMode.audioToEn,
  },
  {
    mode: 'base_to_past',
    label: '過去形',
    description: '原形から過去形を入力',
    icon: '⏪',
    color: Colors.quizMode.baseToPast,
    requiredPartOfSpeech: ['verb'],
    requiredConjugationTypes: ['past_tense'],
  },
  {
    mode: 'base_to_past_participle',
    label: '過去分詞形',
    description: '原形から過去分詞形を入力',
    icon: '⏪',
    color: Colors.quizMode.baseToPast,
    requiredPartOfSpeech: ['verb'],
    requiredConjugationTypes: ['past_participle'],
  },
  {
    mode: 'base_to_past_both',
    label: '過去形・過去分詞形（両方）',
    description: '過去形と過去分詞形を両方入力',
    icon: '⏪',
    color: Colors.quizMode.baseToPast,
    requiredPartOfSpeech: ['verb'],
    requiredConjugationTypes: ['past_tense', 'past_participle'],
    dualAnswer: true,
  },
  {
    mode: 'base_to_plural',
    label: '複数形',
    description: '単数形から複数形を入力',
    icon: '📚',
    color: Colors.quizMode.baseToPlural,
    requiredPartOfSpeech: ['noun'],
    requiredConjugationTypes: ['plural'],
  },
  {
    mode: 'base_to_comparative',
    label: '比較級',
    description: '原級から比較級を入力',
    icon: '📈',
    color: Colors.quizMode.baseToComparative,
    requiredPartOfSpeech: ['adjective', 'adverb'],
    requiredConjugationTypes: ['comparative'],
  },
  {
    mode: 'base_to_superlative',
    label: '最上級',
    description: '原級から最上級を入力',
    icon: '📈',
    color: Colors.quizMode.baseToComparative,
    requiredPartOfSpeech: ['adjective', 'adverb'],
    requiredConjugationTypes: ['superlative'],
  },
  {
    mode: 'base_to_comparative_both',
    label: '比較級・最上級（両方）',
    description: '比較級と最上級を両方入力',
    icon: '📈',
    color: Colors.quizMode.baseToComparative,
    requiredPartOfSpeech: ['adjective', 'adverb'],
    requiredConjugationTypes: ['comparative', 'superlative'],
    dualAnswer: true,
  },
];

export const getQuizModeConfig = (mode: QuizMode): QuizModeConfig => {
  const config = QUIZ_MODE_CONFIGS.find(c => c.mode === mode);
  if (!config) throw new Error(`Unknown quiz mode: ${mode}`);
  return config;
};

/** Groups used for the mode selection UI. Each group may have sub-options. */
export interface QuizModeGroup {
  key: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  modes: { mode: QuizMode; label: string }[];
}

export const QUIZ_MODE_GROUPS: QuizModeGroup[] = [
  {
    key: 'jp',
    label: '日本語→英語',
    icon: '🇯🇵',
    color: Colors.quizMode.jpToEn,
    description: '日本語の意味から英単語を入力',
    modes: [{ mode: 'jp_to_en', label: '日本語→英語' }],
  },
  {
    key: 'audio',
    label: '発音→英語',
    icon: '🔊',
    color: Colors.quizMode.audioToEn,
    description: '発音を聞いて/見て英単語を入力',
    modes: [{ mode: 'audio_to_en', label: '発音→英語' }],
  },
  {
    key: 'past',
    label: '過去形・過去分詞形',
    icon: '⏪',
    color: Colors.quizMode.baseToPast,
    description: '動詞の過去形や過去分詞形を入力',
    modes: [
      { mode: 'base_to_past', label: '過去形のみ' },
      { mode: 'base_to_past_participle', label: '過去分詞形のみ' },
      { mode: 'base_to_past_both', label: '両方' },
    ],
  },
  {
    key: 'plural',
    label: '複数形',
    icon: '📚',
    color: Colors.quizMode.baseToPlural,
    description: '単数形から複数形を入力',
    modes: [{ mode: 'base_to_plural', label: '複数形' }],
  },
  {
    key: 'comparative',
    label: '比較級・最上級',
    icon: '📈',
    color: Colors.quizMode.baseToComparative,
    description: '形容詞・副詞の比較級や最上級を入力',
    modes: [
      { mode: 'base_to_comparative', label: '比較級のみ' },
      { mode: 'base_to_superlative', label: '最上級のみ' },
      { mode: 'base_to_comparative_both', label: '両方' },
    ],
  },
];

export const getGroupKeyForMode = (mode: QuizMode): string => {
  for (const group of QUIZ_MODE_GROUPS) {
    if (group.modes.some(m => m.mode === mode)) return group.key;
  }
  return 'jp';
};
