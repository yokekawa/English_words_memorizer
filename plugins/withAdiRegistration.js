/**
 * Expo config plugin that drops Google Play's package-name registration
 * token into the Android APK's assets folder during prebuild.
 *
 * Required by Play Console's "package name registration" flow (the
 * mechanism that proves we control both the signing key and the package
 * name before Google lets us claim it). The token is not a secret — it
 * is account-scoped and will be rejected if anyone else tries to use it.
 *
 * After registration is complete, this plugin is harmless to leave in
 * place; the file just sits in assets and is ignored at runtime.
 *
 * Reference:
 *   https://support.google.com/googleplay/android-developer/answer/16761053
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TOKEN = 'DB7JIJDSN55Y2AAAAAAAAAAAAA';

module.exports = function withAdiRegistration(config) {
  return withDangerousMod(config, [
    'android',
    async config => {
      const assetsDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/assets'
      );
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.writeFileSync(
        path.join(assetsDir, 'adi-registration.properties'),
        TOKEN
      );
      return config;
    },
  ]);
};
