const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

// Android 16 ignores orientation and resizability restrictions on large
// screens. app.json now uses the unrestricted `default` orientation; this mod
// also makes the generated MainActivity declaration explicit and idempotent so
// a future Expo template cannot silently reintroduce either Play warning.
module.exports = function withAndroidLargeScreens(config) {
  return withAndroidManifest(config, (cfg) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    delete activity.$['android:screenOrientation'];
    activity.$['android:resizeableActivity'] = 'true';
    return cfg;
  });
};
