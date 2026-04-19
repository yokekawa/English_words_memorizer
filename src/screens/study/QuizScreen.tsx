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
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [activeField, setActiveField] = useState<0 | 1>(0);
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

  // Reset input state when moving to a new question
  useEffect(() => {
    setInput1('');
    setInput2('');
    setActiveField(0);
    setWrongAttempts(0);
    setFeedbackState(null);
  }, [currentIndex]);

  if (!session) return null;

  const currentQuestion = session.questions[currentIndex];
  const correctCount = session.attempts.filter(a => a.isCorrect).length;

  if (!currentQuestion) return null;

  const isDual = currentQuestion.correctAnswer2 !== undefined;
  const currentAnswer = activeField === 0
    ? currentQuestion.correctAnswer
    : (currentQuestion.correctAnswer2 ?? '');
  const currentInput = activeField === 0 ? input1 : input2;

  const doSubmit = async (ans1: string, ans2: string) => {
    if (isSubmitting || feedbackState !== null) return;
    setIsSubmitting(true);

    const attempt = await submitAnswer(ans1, isDual ? ans2 : undefined);
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

    const expectedChar = currentAnswer[currentInput.length];
    if (!expectedChar) return;

    if (key.toLowerCase() === expectedChar.toLowerCase()) {
      const newInput = currentInput + key.toLowerCase();
      if (activeField === 0) {
        setInput1(newInput);
      } else {
        setInput2(newInput);
      }

      if (newInput.length === currentAnswer.length) {
        if (activeField === 0 && isDual) {
          // Move to second field
          setActiveField(1);
          setWrongAttempts(0);
        } else {
          // All fields complete — submit
          const finalAns1 = activeField === 0 ? newInput : input1;
          const finalAns2 = activeField === 1 ? newInput : input2;
          doSubmit(finalAns1, finalAns2);
        }
      }
    } else {
      const newWrongCount = wrongAttempts + 1;
      if (hapticEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      if (newWrongCount >= MAX_WRONG_ATTEMPTS) {
        if (activeField === 0 && isDual) {
          // Give up on field 1, move to field 2 with empty input
          setActiveField(1);
          setWrongAttempts(0);
        } else {
          // Submit with whatever we have (current field forced empty)
          const finalAns1 = activeField === 0 ? '' : input1;
          const finalAns2 = activeField === 1 ? '' : input2;
          doSubmit(finalAns1, finalAns2);
        }
      } else {
        setWrongAttempts(newWrongCount);
      }
    }
  };

  const primaryAnswerLength = currentQuestion.correctAnswer.length;
  const secondaryAnswerLength = (currentQuestion.correctAnswer2 ?? '').length;

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
        audioUrl={currentQuestion.audioUrl}
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
          value={input1}
          maxLength={Math.max(primaryAnswerLength + 2, 8)}
          isCorrect={feedbackState}
          correctAnswer={
            feedbackState === false ? currentQuestion.correctAnswer : undefined
          }
          label={isDual ? currentQuestion.label1 : undefined}
          active={activeField === 0}
        />
        {isDual && (
          <AnswerInput
            value={input2}
            maxLength={Math.max(secondaryAnswerLength + 2, 8)}
            isCorrect={feedbackState}
            correctAnswer={
              feedbackState === false ? currentQuestion.correctAnswer2 : undefined
            }
            label={currentQuestion.label2}
            active={activeField === 1}
          />
        )}
      </View>

      <VirtualKeyboard
        onKeyPress={handleKeyPress}
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
    gap: Spacing.md,
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
