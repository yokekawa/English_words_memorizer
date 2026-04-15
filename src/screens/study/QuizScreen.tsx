import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StudyStackParams } from '@/types';
import QuizQuestion from '@/components/quiz/QuizQuestion';
import AnswerInput from '@/components/quiz/AnswerInput';
import VirtualKeyboard from '@/components/quiz/VirtualKeyboard';
import ProgressBar from '@/components/quiz/ProgressBar';
import { useQuizStore } from '@/store/quizStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Colors } from '@/constants';

type Props = NativeStackScreenProps<StudyStackParams, 'Quiz'>;

const FEEDBACK_DELAY_MS = 1500;

export default function QuizScreen({ navigation }: Props) {
  const [input, setInput] = useState('');
  const [feedbackState, setFeedbackState] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const session = useQuizStore(s => s.session);
  const currentIndex = useQuizStore(s => s.currentIndex);
  const submitAnswer = useQuizStore(s => s.submitAnswer);
  const nextQuestion = useQuizStore(s => s.nextQuestion);
  const endSession = useQuizStore(s => s.endSession);
  const hapticEnabled = useSettingsStore(s => s.hapticEnabled);

  useEffect(() => {
    if (!session || session.questions.length === 0) {
      Alert.alert('エラー', '問題がありません', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, []);

  if (!session) return null;

  const currentQuestion = session.questions[currentIndex];
  const correctCount = session.attempts.filter(a => a.isCorrect).length;

  if (!currentQuestion) return null;

  const handleSubmit = async () => {
    if (!input.trim() || isSubmitting || feedbackState !== null) return;
    setIsSubmitting(true);

    const attempt = await submitAnswer(input.trim());
    if (!attempt) {
      setIsSubmitting(false);
      return;
    }

    setFeedbackState(attempt.isCorrect);
    if (hapticEnabled) {
      if (attempt.isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }

    setTimeout(async () => {
      setFeedbackState(null);
      setInput('');
      setIsSubmitting(false);

      const nextIndex = currentIndex + 1;
      if (nextIndex >= session.questions.length) {
        // End of session
        const result = await endSession();
        if (result) {
          navigation.replace('Result', { sessionId: result.sessionId });
        }
      } else {
        nextQuestion();
      }
    }, FEEDBACK_DELAY_MS);
  };

  const handleKeyPress = (key: string) => {
    if (feedbackState !== null || isSubmitting) return;
    setInput(prev => prev + key);
  };

  const handleBackspace = () => {
    if (feedbackState !== null || isSubmitting) return;
    setInput(prev => prev.slice(0, -1));
  };

  return (
    <View
      style={[
        styles.container,
        feedbackState === true && styles.correctBg,
        feedbackState === false && styles.incorrectBg,
      ]}
    >
      <ProgressBar
        current={currentIndex}
        total={session.questions.length}
        correctCount={correctCount}
      />

      <QuizQuestion
        prompt={currentQuestion.prompt}
        mode={currentQuestion.mode}
        questionNumber={currentIndex + 1}
        totalQuestions={session.questions.length}
      />

      <View style={styles.inputContainer}>
        <AnswerInput
          value={input}
          maxLength={Math.max(currentQuestion.correctAnswer.length + 2, 8)}
          isCorrect={feedbackState}
          correctAnswer={
            feedbackState === false ? currentQuestion.correctAnswer : undefined
          }
        />
      </View>

      <VirtualKeyboard
        onKeyPress={handleKeyPress}
        onBackspace={handleBackspace}
        onSubmit={handleSubmit}
        currentInput={input}
        disabled={feedbackState !== null || isSubmitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
  },
  correctBg: {
    backgroundColor: Colors.successLight,
  },
  incorrectBg: {
    backgroundColor: Colors.errorLight,
  },
  inputContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
