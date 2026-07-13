module.exports = function babelConfig(api) {
  api.cache(true);
  // babel-preset-expo wires up the React Native + Reanimated transforms. Tamagui
  // runs fine without its optional compiler plugin (that's a build-time perf
  // optimisation only), so we keep the toolchain minimal.
  return {
    presets: ['babel-preset-expo'],
  };
};
