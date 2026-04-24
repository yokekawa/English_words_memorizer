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
import Button from '@/components/common/Button';
import { useQuizStore } from '@/store/quizStore';
import { useSettingsStore } from '@/store/settingsStore';
import { evaluateAnswerAny } from '@/services/scoringService';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants';

type Props = NativeStackScreenProps<StudyStackParams, 'Quiz'>;

const FEEDBACK_DELAY_MS = 1500;
const MAX_WRONG_ATTEMPTS = 5;
const PRACTICE_REPEATS = 3;

export default function QuizScreen({ navigation }: Props) {
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [activeField, setActiveField] = useState<0 | 1>(0);
  const [feedbackState, setFeedbackState] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  // Review state: wrong answer submitted (not during practice), waiting for
  // user to click "次の問題へ" or "練習する".
  const [awaitingUserAction, setAwaitingUserAction] = useState(false);
  // Number of practice repetitions remaining for the current question.
  // 0 = normal mode; 1..PRACTICE_REPEATS = currently practicing.
  const [practiceRemaining, setPracticeRemaining] = useState(0);

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
    setAwaitingUserAction(false);
    setPracticeRemaining(0);
  }, [currentIndex]);

  if (!session) return null;

  const currentQuestion = session.questions[currentIndex];
  const correctCount = session.attempts.filter(a => a.isCorrect).length;

  if (!currentQuestion) return null;

  const isDual = currentQuestion.correctAnswer2 !== undefined;
  const acceptableForField = (field: 0 | 1): string[] => {
    if (field === 0) {
      return currentQuestion.acceptableAnswers ?? [currentQuestion.correctAnswer];
    }
    return (
      currentQuestion.acceptableAnswers2 ?? [currentQuestion.correctAnswer2 ?? '']
    );
  };
  const currentAcceptable = acceptableForField(activeField);
  const currentInput = activeField === 0 ? input1 : input2;

  const advanceToNextQuestion = async () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= session.questions.length) {
      const result = await endSession();
      if (result) {
        navigation.replace('Result', { sessionId: result.sessionId });
      }
    } else {
      nextQuestion();
    }
  };

  const resetInputState = () => {
    setInput1('');
    setInput2('');
    setActiveField(0);
    setWrongAttempts(0);
    setFeedbackState(null);
  };

  const fireFeedbackHaptic = (correct: boolean) => {
    if (!hapticEnabled) return;
    Haptics.notificationAsync(
      correct
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error
    );
  };

  const doSubmit = async (ans1: string, ans2: string) => {
    if (isSubmitting || feedbackState !== null) return;
    setIsSubmitting(true);

    // During practice, evaluate locally and do NOT record an attempt — the
    // real stats for the word are set by the original submission only.
    if (practiceRemaining > 0) {
      const correct1 = evaluateAnswerAny(ans1, acceptableForField(0));
      const correct2 = isDual
        ? evaluateAnswerAny(ans2, acceptableForField(1))
        : true;
      const correct = correct1 && correct2;
      setFeedbackState(correct);
      fireFeedbackHaptic(correct);

      setTimeout(() => {
        setIsSubmitting(false);
        const remaining = practiceRemaining - 1;
        setPracticeRemaining(remaining);
        if (remaining > 0) {
          resetInputState();
        } else {
          advanceToNextQuestion();
        }
      }, FEEDBACK_DELAY_MS);
      return;
    }

    // Normal mode: record the attempt to session stats.
    const attempt = await submitAnswer(ans1, isDual ? ans2 : undefined);
    if (!attempt) {
      setIsSubmitting(false);
      return;
    }

    setFeedbackState(attempt.isCorrect);
    fireFeedbackHaptic(attempt.isCorrect);

    if (attempt.isCorrect) {
      // Auto-advance after brief feedback, as before.
      setTimeout(() => {
        setIsSubmitting(false);
        advanceToNextQuestion();
      }, FEEDBACK_DELAY_MS);
    } else {
      // Wrong: stop on this question until the user picks an action.
      setIsSubmitting(false);
      setAwaitingUserAction(true);
    }
  };

  const handleGoNext = () => {
    setAwaitingUserAction(false);
    advanceToNextQuestion();
  };

  const handleStartPractice = () => {
    setAwaitingUserAction(false);
    setPracticeRemaining(PRACTICE_REPEATS);
    resetInputState();
  };

  const handleKeyPress = (key: string) => {
    if (feedbackState !== null || isSubmitting) return;

    // Candidate new input — accept iff any acceptable answer starts with it.
    const candidate = (currentInput + key).toLowerCase();
    const matchesAnyPrefix = currentAcceptable.some(ans =>
      ans.toLowerCase().startsWith(candidate)
    );

    if (matchesAnyPrefix) {
      const newInput = candidate;
      if (activeField === 0) {
        setInput1(newInput);
      } else {
        setInput2(newInput);
      }

      // Completed iff the typed input equals any acceptable answer in full.
      const completesAnswer = currentAcceptable.some(
        ans => ans.toLowerCase() === newInput
      );
      if (completesAnswer) {
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

  const maxLen = (answers: string[]): number =>
    answers.reduce((m, a) => Math.max(m, a.length), 0);
  const primaryAnswerLength = maxLen(acceptableForField(0));
  const secondaryAnswerLength = isDual ? maxLen(acceptableForField(1)) : 0;

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

      {practiceRemaining > 0 && (
        <View style={styles.practiceBar}>
          <Text style={styles.practiceText}>
            🔁 練習中  {PRACTICE_REPEATS - practiceRemaining + 1} / {PRACTICE_REPEATS}
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

      {awaitingUserAction ? (
        <View style={styles.reviewBar}>
          <Button
            label="練習する (3回)"
            onPress={handleStartPractice}
            variant="secondary"
            style={styles.reviewBtn}
          />
          <Button
            label="次の問題へ"
            onPress={handleGoNext}
            variant="primary"
            style={styles.reviewBtn}
          />
        </View>
      ) : (
        <VirtualKeyboard
          onKeyPress={handleKeyPress}
          disabled={feedbackState !== null || isSubmitting}
        />
      )}
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
  practiceBar: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primary + '18',
  },
  practiceText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  reviewBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reviewBtn: {
    flex: 1,
  },
});
