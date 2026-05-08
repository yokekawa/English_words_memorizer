import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';
import RootNavigator from '@/navigation/RootNavigator';
import { DatabaseProvider } from '@/database/db';

// Fire-and-forget AdMob SDK init at module load. Safe to call before render —
// the SDK queues requests until initialization resolves, so a banner mounted
// immediately afterwards still works.
mobileAds()
  .initialize()
  .catch(() => {
    // Initialization can fail if the device is offline or the App ID is
    // misconfigured; nothing actionable from here, ad units will simply
    // fail to load until conditions improve.
  });

export default function App() {
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
});
