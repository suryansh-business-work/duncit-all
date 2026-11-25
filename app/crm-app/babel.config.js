module.exports = function babelConfig(api) {
  api.cache(true);
  // Same minimal toolchain as the member app: babel-preset-expo wires up the
  // React Native + Reanimated transforms; Tamagui runs without its compiler.
  return {
    presets: ['babel-preset-expo'],
  };
};
