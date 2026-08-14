const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

// Play Console reports "Optimisation isn't enabled" even though minify and
// resource shrinking are on. The reason is the default rules file React
// Native's template picks: `proguard-android.txt` ships `-dontoptimize`, so R8
// only shrinks and renames and never runs an optimisation pass. The
// `-optimize` variant is the same file with that line removed.
const DEFAULT_RULES = 'getDefaultProguardFile("proguard-android.txt")';
const OPTIMIZED_RULES = 'getDefaultProguardFile("proguard-android-optimize.txt")';

// AGP 8 already defaults full mode on, but Play grades the built artifact and
// the default has flipped before — pin it. `preciseShrinking` is the
// "optimised resource shrinking" the same report asks for.
const GRADLE_PROPERTIES = [
  ['android.enableR8.fullMode', 'true'],
  ['android.enableNewResourceShrinker.preciseShrinking', 'true'],
];

function setProperty(items, key, value) {
  const existing = items.find((item) => item.type === 'property' && item.key === key);
  if (existing) {
    existing.value = value;
    return;
  }
  items.push({ type: 'property', key, value });
}

module.exports = function withAndroidR8Optimization(config) {
  const withRules = withAppBuildGradle(config, (cfg) => {
    const { contents } = cfg.modResults;
    if (contents.includes(OPTIMIZED_RULES)) return cfg; // idempotent
    if (!contents.includes(DEFAULT_RULES)) {
      throw new Error(
        `[withAndroidR8Optimization] expected ${DEFAULT_RULES} in app/build.gradle. ` +
          'The template changed — re-point this plugin before the release build ships unoptimised.',
      );
    }
    cfg.modResults.contents = contents.replace(DEFAULT_RULES, OPTIMIZED_RULES);
    return cfg;
  });

  return withGradleProperties(withRules, (cfg) => {
    for (const [key, value] of GRADLE_PROPERTIES) {
      setProperty(cfg.modResults, key, value);
    }
    return cfg;
  });
};
