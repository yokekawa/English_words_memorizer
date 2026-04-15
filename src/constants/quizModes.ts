import { QuizMode } from '@/types';
import { Colors } from './colors';

export interface QuizModeConfig {
  mode: QuizMode;
  label: string;
  description: string;
  icon: string;
  color: string;
  requiredPartOfSpeech?: string[];
  requiredConjugationType?: string;
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
    mode: 'base_to_past',
    label: '過去形',
    description: '原形から過去形を入力',
    icon: '⏪',
    color: Colors.quizMode.baseToPast,
    requiredPartOfSpeech: ['verb'],
    requiredConjugationType: 'past_tense',
  },
  {
    mode: 'base_to_plural',
    label: '複数形',
    description: '単数形から複数形を入力',
    icon: '📚',
    color: Colors.quizMode.baseToPlural,
    requiredPartOfSpeech: ['noun'],
    requiredConjugationType: 'plural',
  },
  {
    mode: 'base_to_participle',
    label: '現在分詞',
    description: '原形からing形を入力',
    icon: '🔄',
    color: Colors.quizMode.baseToParticiple,
    requiredPartOfSpeech: ['verb'],
    requiredConjugationType: 'present_participle',
  },
  {
    mode: 'base_to_comparative',
    label: '比較級',
    description: '原級から比較級を入力',
    icon: '📈',
    color: Colors.quizMode.baseToComparative,
    requiredPartOfSpeech: ['adjective', 'adverb'],
    requiredConjugationType: 'comparative',
  },
];

export const getQuizModeConfig = (mode: QuizMode): QuizModeConfig => {
  const config = QUIZ_MODE_CONFIGS.find(c => c.mode === mode);
  if (!config) throw new Error(`Unknown quiz mode: ${mode}`);
  return config;
};
