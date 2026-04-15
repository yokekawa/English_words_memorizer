import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RegistrationStackParams } from '@/types';
import CameraScreen from '@/screens/registration/CameraScreen';
import OCRReviewScreen from '@/screens/registration/OCRReviewScreen';
import WordDetailScreen from '@/screens/registration/WordDetailScreen';
import { Colors } from '@/constants';

const Stack = createNativeStackNavigator<RegistrationStackParams>();

export default function RegistrationStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textOnPrimary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="Camera"
        component={CameraScreen}
        options={{ title: '教科書を撮影' }}
      />
      <Stack.Screen
        name="OCRReview"
        component={OCRReviewScreen}
        options={{ title: '単語を選択' }}
      />
      <Stack.Screen
        name="WordDetail"
        component={WordDetailScreen}
        options={{ title: '単語を確認・登録' }}
      />
    </Stack.Navigator>
  );
}
