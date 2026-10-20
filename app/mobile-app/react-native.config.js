/**
 * Truecaller's native module is linked only into a build that was handed its
 * identifiers (scripts/truecaller-build-env.js → plugins/withTruecaller).
 *
 * Its Android SDK ships Java 21 bytecode and needs the app compiled for it,
 * which the config plugin sets up only when it runs — so linking the module
 * into a build the plugin skipped would compile it against settings it cannot
 * build with. Unlinked, the JS side finds no native module and the app shows
 * no Truecaller button.
 */
const androidConfigured = Boolean((process.env.TRUECALLER_ANDROID_CLIENT_ID || '').trim());
const iosConfigured = Boolean(
  (process.env.TRUECALLER_APP_KEY || '').trim() && (process.env.TRUECALLER_IOS_APP_LINK || '').trim(),
);

const truecallerPlatforms = {};
if (!androidConfigured) truecallerPlatforms.android = null;
if (!iosConfigured) truecallerPlatforms.ios = null;

module.exports = {
  dependencies: {
    '@ajitpatel28/react-native-truecaller': { platforms: truecallerPlatforms },
  },
};
