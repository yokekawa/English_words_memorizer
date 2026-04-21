import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WordListStackParams } from '@/types';
import WordListScreen from '@/screens/wordlist/WordListScreen';
import WordEditScreen from '@/screens/wordlist/WordEditScreen';
import ManualEntryScreen from '@/screens/wordlist/ManualEntryScreen';
import { Colors } from '@/constants';

const Stack = createNativeStackNavigator<WordListStackParams>();

export default function WordListStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textOnPrimary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="WordList"
        component={WordListScreen}
        options={{ title: '単語帳' }}
      />
      <Stack.Screen
        name="WordEdit"
        component={WordEditScreen}
        options={{ title: '単語の詳細' }}
      />
      <Stack.Screen
        name="ManualEntry"
        component={ManualEntryScreen}
        options={{ title: '手動入力' }}
      />
    </Stack.Navigator>
  );
}
