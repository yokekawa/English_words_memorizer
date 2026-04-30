import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import { useFonts, NotoSans_400Regular } from '@expo-google-fonts/noto-sans';
import RootNavigator from '@/navigation/RootNavigator';
import { DatabaseProvider } from '@/database/db';

export default function App() {
  const [fontsLoaded] = useFonts({ NotoSans_400Regular });

  if (!fontsLoaded) {
    return <View style={[styles.container, styles.splash]} />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <DatabaseProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </DatabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splash: {
    backgroundColor: '#1a56db',
  },
});
