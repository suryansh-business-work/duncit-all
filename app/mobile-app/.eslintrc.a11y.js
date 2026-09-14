/**
 * Accessibility lint for the native app — REPORT ONLY.
 *
 * Kept out of .eslintrc.js on purpose: `npm run lint` is a zero-warning gate
 * (--max-warnings 0), so a single a11y warning there would fail CI. This file
 * is run by `npm run lint:a11y` (eslint --no-eslintrc -c .eslintrc.a11y.js),
 * which passes no --max-warnings and therefore always exits 0 on warnings.
 *
 * It turns on eslint-plugin-react-native-a11y's `all` preset and nothing else,
 * every rule as a warning. docs/accessibility.md (repo root) holds the plan
 * for flipping these to errors once the count reaches zero.
 */
const a11y = require('eslint-plugin-react-native-a11y');

const toWarn = (entry) => (Array.isArray(entry) ? ['warn', ...entry.slice(1)] : 'warn');

module.exports = {
  root: true,
  // Same parser the main config gets through eslint-config-expo.
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  // The last three turn on NO rules. They are loaded only so the inline
  // `eslint-disable-next-line react-hooks/exhaustive-deps` (etc.) directives
  // in src resolve — an unknown rule in a directive is an ERROR, which would
  // fail this report-only run.
  plugins: ['react-native-a11y', 'react-hooks', 'react', '@typescript-eslint'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'android/',
    'ios/',
    'coverage/',
    '.expo/',
    'src/generated/',
    '**/__tests__/**',
    '**/*.test.*',
    '**/*.cy.*',
  ],
  // Files carry directives for rules only the main config defines.
  reportUnusedDisableDirectives: false,
  rules: Object.fromEntries(
    Object.entries(a11y.configs.all.rules).map(([name, entry]) => [name, toWarn(entry)]),
  ),
};
