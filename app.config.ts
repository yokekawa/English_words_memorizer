import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: '英単語暗記',
  slug: 'english-words-memorizer',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
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
  ],
  extra: {
    googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY ?? '',
  },
});
