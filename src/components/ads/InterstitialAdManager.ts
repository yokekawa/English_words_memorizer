import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';

const UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : (Constants.expoConfig?.extra?.admobInterstitialAdUnitId as
      | string
      | undefined) || TestIds.INTERSTITIAL;

/**
 * Frequency caps so the interstitial doesn't feel intrusive in a learning
 * loop. Tracked purely in-memory: a fresh launch resets the daily counter,
 * which is fine because a single launched session rarely runs 3 quizzes
 * back-to-back and any minor over-show across launches is acceptable.
 */
const SHOW_EVERY_N_TRIGGERS = 3;
const DAILY_MAX = 3;

let cached: InterstitialAd | null = null;
let cachedLoaded = false;
let triggerCount = 0;
let todayShown = 0;
let todayKey = '';

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function rolloverIfNewDay(): void {
  const key = todayString();
  if (key !== todayKey) {
    todayKey = key;
    todayShown = 0;
  }
}

function build(): InterstitialAd {
  const ad = InterstitialAd.createForAdRequest(UNIT_ID, {
    requestNonPersonalizedAdsOnly: false,
  });
  ad.addAdEventListener(AdEventType.LOADED, () => {
    cachedLoaded = true;
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    cached = null;
    cachedLoaded = false;
  });
  return ad;
}

export function preloadInterstitial(): void {
  if (cached) return;
  cached = build();
  cached.load();
}

/**
 * Trigger an interstitial at a natural break point. Returns synchronously
 * with no callbacks — the caller continues navigation immediately; if the
 * ad is shown it overlays. Honours both per-N-trigger and daily caps; on
 * cap or no-load, this is a no-op.
 */
export function maybeShowInterstitial(): void {
  rolloverIfNewDay();
  triggerCount += 1;
  if (triggerCount % SHOW_EVERY_N_TRIGGERS !== 0) {
    preloadInterstitial();
    return;
  }
  if (todayShown >= DAILY_MAX) {
    return;
  }
  if (!cached || !cachedLoaded) {
    preloadInterstitial();
    return;
  }

  const ad = cached;
  const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
    unsubClosed();
    cached = null;
    cachedLoaded = false;
    preloadInterstitial();
  });
  ad.show();
  todayShown += 1;
}
