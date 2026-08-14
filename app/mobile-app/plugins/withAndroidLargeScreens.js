const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

// Play Console flags `android:screenOrientation="portrait"` on MainActivity:
// from Android 16, large screens (foldables, tablets) ignore orientation and
// resizability restrictions outright, so declaring one only costs us a warning
// and a compat letterbox. We drop the attribute and declare the activity
// resizeable; phones are held to portrait at runtime instead, by
// `useLargeScreenOrientation`, which is the only place that can tell a folded
// foldable from an unfolded one.
//
// `orientation: "portrait"` stays in app.json because iOS still reads it.
// Expo's own AndroidConfig.Orientation.withOrientation writes the attribute from
// that same field, and registers AFTER this plugin (getConfig applies app.json
// plugins, then getPrebuildConfig adds withAndroidExpoPlugins) — mods run
// last-registered-first, so Expo writes the attribute and this mod, running
// last, removes it. Ordering is load-bearing; don't move this into a plugin
// that runs earlier.
module.exports = function withAndroidLargeScreens(config) {
  return withAndroidManifest(config, (cfg) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    delete activity.$['android:screenOrientation'];
    activity.$['android:resizeableActivity'] = 'true';
    return cfg;
  });
};
