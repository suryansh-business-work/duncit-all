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
    'cypress-artifacts/',
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
    // eslint-plugin-react-hooks 7 (pulled in by eslint-config-expo 57) ships the
    // React Compiler rule set enabled by default — 141 findings across the app
    // on the day of the SDK 57 upgrade, none of which this zero-warning gate
    // ever promised to hold. The two rules the gate has always meant —
    // rules-of-hooks and exhaustive-deps — stay on above; the compiler family
    // is off until adopting it is its own piece of work with its own diff.
    'react-hooks/set-state-in-effect': 'off',
    'react-hooks/set-state-in-render': 'off',
    'react-hooks/refs': 'off',
    'react-hooks/incompatible-library': 'off',
    'react-hooks/purity': 'off',
    'react-hooks/immutability': 'off',
    'react-hooks/globals': 'off',
    'react-hooks/static-components': 'off',
    'react-hooks/use-memo': 'off',
    'react-hooks/preserve-manual-memoization': 'off',
    'react-hooks/unsupported-syntax': 'off',
    'react-hooks/error-boundaries': 'off',
    'react-hooks/component-hook-factories': 'off',
    'react-hooks/gating': 'off',
    'react-hooks/config': 'off',
  },
};
