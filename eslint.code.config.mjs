/**
 * Code lint for every workspace except the native app (which has its own
 * eslint 8 config and zero-warning gate in app/mobile-app).
 *
 * Named eslint.code.config.mjs, never eslint.config.*, and always passed with
 * `-c`: ESLint 8.57 in app/mobile-app looks UP the tree for an eslint.config
 * file, finds one at the root, switches to flat mode and rejects its own
 * `--ext` flag — which broke the native app's lint gate.
 *
 * Until this file, nothing in the pnpm workspace ran a code linter: CI's
 * `pnpm run --if-present lint` found no script in 92 of 94 workspaces and
 * skipped silently, so the rules in .claude/CLAUDE.md were only ever checked by
 * Sonar, after the push.
 *
 * RATCHET, not a big-bang cleanup: eslint-suppressions.json (ESLint's bulk
 * suppressions) freezes every violation that existed when this was turned on,
 * so only NEW code has to pass. Fixing an old one never fails the run
 * (--pass-on-unpruned-suppressions); `pnpm lint:prune` drops the fixed entries.
 * Never run `--suppress-all` again to get a push through.
 *
 * Parser: @babel/eslint-parser, syntax only — @typescript-eslint/parser drives
 * the classic `typescript` JS API, which the root's TypeScript 7 does not have
 * (same reason as eslint.a11y.config.mjs). So the rules below are the ones
 * that need no type information, chosen to match the Sonar rules this repo
 * fails most.
 */
import babelParser from '@babel/eslint-parser';
import reactHooks from 'eslint-plugin-react-hooks';

/** `// eslint-disable-next-line jsx-a11y/…` (and import/, @typescript-eslint/)
 * comments exist for linters not run by THIS config — jsx-a11y has its own,
 * eslint.a11y.config.mjs. An unknown rule in a directive is an ERROR in ESLint 9. */
const inertRule = { meta: { schema: false }, create: () => ({}) };
const inertPlugin = { rules: new Proxy({}, { get: () => inertRule }) };

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-server/**',
      '**/build/**',
      '**/coverage/**',
      '**/.astro/**',
      '**/generated/**',
      '**/*.d.ts',
      '**/*.{js,mjs,cjs}',
      '**/__tests__/**',
      '**/*.cy.*',
      '**/*.{test,spec}.*',
      'app/mobile-app/**',
      'portals/crm/open-wa-server/**',
      // Generated data, not code.
      'server/src/modules/platform/localization/shipped-keys.ts',
      'server/src/modules/platform/packageUpdates/package-manifest.ts',
      'server/src/modules/platform/e2eFlow/catalogue/**',
    ],
  },
  {
    name: 'duncit/code',
    files: [
      'app/mweb/{src,server}/**/*.{ts,tsx}',
      'portals/*/src/**/*.{ts,tsx}',
      'packages/*/src/**/*.{ts,tsx}',
      'website/*/{src,server}/**/*.{ts,tsx}',
      'lite/{web,portal,shared,server}/**/*.{ts,tsx}',
      'server/src/**/*.ts',
    ],
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': inertPlugin,
      import: inertPlugin,
      '@typescript-eslint': inertPlugin,
    },
    languageOptions: {
      parser: babelParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false,
          parserOpts: { plugins: ['jsx', 'typescript', 'decorators-legacy'] },
        },
      },
    },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {
      // The two hooks rules React itself ships; the rest of v7's preset is the
      // React Compiler's, which this codebase does not use.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // Sonar S3358 (nested ternary — the repo's most frequent issue) and S7735.
      'no-nested-ternary': 'error',
      'no-negated-condition': 'error',
      'no-restricted-syntax': [
        'error',
        {
          // Sonar S3735 / CLAUDE.md: a voided promise drops its rejection.
          selector: "UnaryExpression[operator='void']",
          message: 'Do not use `void`. Await the promise, or use fireAndForget from @duncit/logs.',
        },
        {
          selector: 'TSAnyKeyword',
          message: 'Avoid `any`: use the generated GraphQL type, a real interface, or `unknown` and narrow it.',
        },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // Correctness: each of these is a bug, not a style.
      'no-async-promise-executor': 'error',
      'no-compare-neg-zero': 'error',
      'no-cond-assign': 'error',
      'no-debugger': 'error',
      'no-dupe-else-if': 'error',
      'no-duplicate-case': 'error',
      'no-empty-pattern': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-sparse-arrays': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-useless-catch': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
    },
  },
];
