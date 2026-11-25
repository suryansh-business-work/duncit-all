module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  ignorePatterns: ['node_modules/', 'dist/', '/android/', '/ios/', 'coverage/', '.expo/', 'expo-env.d.ts', 'src/generated/'],
  rules: {
    'prettier/prettier': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // tsc (`npm run typecheck`) is the import check: eslint's resolver cannot
    // follow the `@/*` paths or the file: workspace packages in an isolated
    // CI install — the same call the member app makes.
    'import/no-unresolved': 'off',
    // eslint-config-expo 57 turns on the React Compiler rule family; this
    // zero-warning gate holds rules-of-hooks and exhaustive-deps, as the
    // member app does, until adopting the compiler is its own change.
    'react-hooks/set-state-in-effect': 'off',
    'react-hooks/refs': 'off',
    'react-hooks/purity': 'off',
    'react-hooks/immutability': 'off',
    'react-hooks/static-components': 'off',
    'react-hooks/preserve-manual-memoization': 'off',
  },
};
