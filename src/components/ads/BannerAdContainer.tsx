import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';
import { Colors } from '@/constants';

/**
 * Bottom-anchored banner ad. Uses Google's reserved test unit ID in
 * development builds so we never accidentally serve live ads to ourselves
 * during dev/testing (which would breach AdMob policy and risk an account
 * strike). Falls back to the production unit ID in release builds.
 */
const BANNER_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : (Constants.expoConfig?.extra?.admobBannerAdUnitId as string | undefined) ??
    TestIds.BANNER;

interface Props {
  // Hide the banner until something more important loads (e.g. content list).
  // Avoids layout-shift jank when navigating into a screen.
  delayMs?: number;
}

export default function BannerAdContainer({ delayMs = 0 }: Props) {
  const [show, setShow] = useState(delayMs === 0);

  useEffect(() => {
    if (delayMs === 0) return;
    const t = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  if (!show) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={BANNER_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
