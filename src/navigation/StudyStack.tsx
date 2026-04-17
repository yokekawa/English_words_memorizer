import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StudyStackParams } from '@/types';
import StudyHomeScreen from '@/screens/study/StudyHomeScreen';
import WordSelectionScreen from '@/screens/study/WordSelectionScreen';
import QuizScreen from '@/screens/study/QuizScreen';
import ResultScreen from '@/screens/study/ResultScreen';
import { Colors } from '@/constants';

const Stack = createNativeStackNavigator<StudyStackParams>();

export default function StudyStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textOnPrimary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="StudyHome"
        component={StudyHomeScreen}
        options={{ title: '学習モード' }}
      />
      <Stack.Screen
        name="WordSelection"
        component={WordSelectionScreen}
        options={{ title: '出題する単語を選ぶ' }}
      />
      <Stack.Screen
        name="Quiz"
        component={QuizScreen}
        options={{ title: 'クイズ', headerBackVisible: false }}
      />
      <Stack.Screen
        name="Result"
        component={ResultScreen}
        options={{ title: '結果', headerBackVisible: false }}
      />
    </Stack.Navigator>
  );
}
