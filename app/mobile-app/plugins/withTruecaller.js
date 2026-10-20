const sdkPlugin = require('@ajitpatel28/react-native-truecaller/app.plugin.js');

// The package compiles its plugin as an ES module: the function is its default export.
const withTruecallerSdk = sdkPlugin.default ?? sdkPlugin;

/**
 * Truecaller's native setup, from the identifiers the build was handed
 * (scripts/truecaller-build-env.js, from Tech → Environment → Truecaller).
 *
 * Each platform is set up only when its identifiers are present, and what was
 * set up is recorded in `extra.truecaller` — the app reads it to decide
 * whether to show the button, because a button whose SDK was never configured
 * can only fail.
 */
module.exports = function withTruecaller(config) {
  const androidClientId = (process.env.TRUECALLER_ANDROID_CLIENT_ID || '').trim();
  const iosAppKey = (process.env.TRUECALLER_APP_KEY || '').trim();
  const iosAppLink = (process.env.TRUECALLER_IOS_APP_LINK || '').trim();
  const ios = Boolean(iosAppKey && iosAppLink);
  const configured = {
    ...config,
    extra: { ...config.extra, truecaller: { android: Boolean(androidClientId), ios } },
  };
  if (!androidClientId && !ios) return configured;
  return withTruecallerSdk(configured, {
    androidClientId: androidClientId || undefined,
    iosAppKey: ios ? iosAppKey : undefined,
    iosAppLink: ios ? iosAppLink : undefined,
  });
};
