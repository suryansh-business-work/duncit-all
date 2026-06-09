const { withProjectBuildGradle } = require('expo/config-plugins');

// React Native 0.81 uses C++20 `std::format` (graphicsConversions.h), which needs
// NDK 27's libc++. Expo's ExpoRootProjectPlugin sets `rootProject.ext.ndkVersion`
// via `setIfNotExist { versionCatalogs.getVersionOrDefault("ndkVersion", "27...") }`,
// and in this pnpm-monorepo / `file:`-dep setup the catalog resolves to NDK 26 (no
// `std::format`) → the EAS native build fails. We pre-set the property in the root
// build.gradle BEFORE that plugin applies, so `setIfNotExist` keeps our value (27).
const NDK_VERSION = '27.1.12297006';
const ANCHOR = 'apply plugin: "expo-root-project"';
const LINE = `ext.ndkVersion = "${NDK_VERSION}"`;

module.exports = function withNdkVersion(config) {
  return withProjectBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (contents.includes('ext.ndkVersion')) return cfg; // idempotent
    contents = contents.includes(ANCHOR)
      ? contents.replace(ANCHOR, `${LINE}\n${ANCHOR}`)
      : `${LINE}\n${contents}`;
    cfg.modResults.contents = contents;
    return cfg;
  });
};
