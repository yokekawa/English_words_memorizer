import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { Colors, FontSize, FontWeight, Spacing } from '@/constants';

type Props = NativeStackScreenProps<StudyStackParams, 'Quiz'>;

const FEEDBACK_DELAY_MS = 1500;
const MAX_WRONG_ATTEMPTS = 5;

export default function QuizScreen({ navigation }: Props) {
  const [input, setInput] = useState('');
  const [feedbackState, setFeedbackState] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);

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

  const doSubmit = async (answer: string) => {
    if (isSubmitting || feedbackState !== null) return;
    setIsSubmitting(true);

    const attempt = await submitAnswer(answer);
    if (!attempt) {
      setIsSubmitting(false);
      return;
    }

    setFeedbackState(attempt.isCorrect);
    if (hapticEnabled) {
      Haptics.notificationAsync(
        attempt.isCorrect
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
    }

    setTimeout(async () => {
      setFeedbackState(null);
      setInput('');
      setWrongAttempts(0);
      setIsSubmitting(false);

      const nextIdx = currentIndex + 1;
      if (nextIdx >= session.questions.length) {
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

    const expectedChar = currentQuestion.correctAnswer[input.length];
    if (!expectedChar) return;

    if (key.toLowerCase() === expectedChar.toLowerCase()) {
      // Correct key: accept it
      const newInput = input + key.toLowerCase();
      setInput(newInput);
      if (newInput.length === currentQuestion.correctAnswer.length) {
        // Answer complete: auto-submit
        doSubmit(newInput);
      }
    } else {
      // Wrong key: count as miss, don't accept
      const newWrongCount = wrongAttempts + 1;
      if (hapticEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      if (newWrongCount >= MAX_WRONG_ATTEMPTS) {
        // Too many misses: force incorrect
        doSubmit('');
      } else {
        setWrongAttempts(newWrongCount);
      }
    }
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

      {wrongAttempts > 0 && feedbackState === null && (
        <View style={styles.wrongBar}>
          <Text style={styles.wrongText}>
            ミス {wrongAttempts}/{MAX_WRONG_ATTEMPTS}
          </Text>
        </View>
      )}

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
        onBackspace={() => {}}
        onSubmit={() => {}}
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
  wrongBar: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  wrongText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.error,
  },
});
