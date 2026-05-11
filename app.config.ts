import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: '英単語暗記',
  slug: 'english-words-memorizer',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/dbaa0d80-2d1e-4ce3-b8fb-8fddf6d1d5d6',
  },
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#1a56db',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.yokekawa.englishwordsmemorizer',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1a56db',
    },
    package: 'com.yokekawa.englishwordsmemorizer',
    versionCode: 3,
  },
  plugins: [
    [
      'expo-camera',
      {
        cameraPermission: 'カメラを使用して教科書のテキストを読み取ります。',
      },
    ],
    [
      'expo-av',
      {
        microphonePermission: false,
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: 'ca-app-pub-4248382033901204~8727658558',
      },
    ],
    './plugins/withAdiRegistration',
  ],
  extra: {
    googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY ?? '',
    eas: {
      projectId: 'dbaa0d80-2d1e-4ce3-b8fb-8fddf6d1d5d6',
    },
    androidPackage: 'com.yokekawa.englishwordsmemorizer',
    androidCertSha1: process.env.ANDROID_CERT_SHA1 ?? '',
    admobBannerAdUnitId:       'ca-app-pub-4248382033901204/9999387942',
    admobInterstitialAdUnitId: 'ca-app-pub-4248382033901204/4236379624',
    // TODO: replace with the rewarded ad unit from AdMob once issued.
    // Until then the runtime falls back to Google's test rewarded unit
    // so OCR-quota top-up still works for internal testing.
    admobRewardedAdUnitId:     '',
  },
});
