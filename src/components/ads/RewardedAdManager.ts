import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';

const UNIT_ID = __DEV__
  ? TestIds.REWARDED
  : (Constants.expoConfig?.extra?.admobRewardedAdUnitId as string | undefined) ||
    TestIds.REWARDED;

let cached: RewardedAd | null = null;
let cachedLoaded = false;

function build(): RewardedAd {
  const ad = RewardedAd.createForAdRequest(UNIT_ID, {
    requestNonPersonalizedAdsOnly: false,
  });
  ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
    cachedLoaded = true;
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    cached = null;
    cachedLoaded = false;
  });
  return ad;
}

/**
 * Preload a rewarded ad so it can be shown instantly when the user opts in.
 * Safe to call multiple times; only the first call actually loads.
 */
export function preloadRewardedAd(): void {
  if (cached) return;
  cached = build();
  cached.load();
}

/**
 * Show the currently-loaded rewarded ad. Resolves to true only after the SDK
 * fires EARNED_REWARD, which means the user watched far enough to qualify
 * for the reward. Resolves to false on dismiss-before-reward, load failure
 * or no-fill.
 */
export function showRewardedAd(): Promise<boolean> {
  return new Promise(resolve => {
    if (!cached) {
      cached = build();
    }
    const ad = cached;
    let earned = false;

    const cleanup = () => {
      unsubEarned();
      unsubClosed();
      unsubError();
      cached = null;
      cachedLoaded = false;
      preloadRewardedAd();
    };

    const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      cleanup();
      resolve(earned);
    });
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      cleanup();
      resolve(false);
    });

    if (cachedLoaded) {
      ad.show();
    } else {
      const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        unsubLoaded();
        ad.show();
      });
      ad.load();
    }
  });
}
