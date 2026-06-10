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
    // Redundant with the `tsc --noEmit` step in `npm run ci` (TypeScript is the
    // authoritative import check). eslint-plugin-import's resolver can't follow
    // the `@/*` tsconfig paths or the `@duncit/auth-tokens` file: workspace dep
    // in an isolated CI install (no pnpm-root node_modules to walk up into),
    // so leave module resolution to tsc.
    'import/no-unresolved': 'off',
  },
};
