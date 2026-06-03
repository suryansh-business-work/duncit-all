module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'android/',
    'ios/',
    'coverage/',
    '.expo/',
    'expo-env.d.ts',
    'src/generated/',
  ],
  rules: {
    'prettier/prettier': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
