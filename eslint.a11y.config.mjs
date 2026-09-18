/**
 * Accessibility lint for every MUI surface — mWeb, the portals and the shared
 * web packages. BLOCKING (WCAG 2.2 AA): every rule is an error and
 * `pnpm lint:a11y` runs with --max-warnings 0. The count reached zero across
 * every surface, so a new finding fails CI instead of joining a backlog.
 * docs/accessibility.md holds the checklist behind it.
 *
 * This is deliberately a separate config file rather than a workspace lint:
 * nothing else in the pnpm workspace runs ESLint, and this file only ever
 * turns on jsx-a11y.
 *
 * Parser: @babel/eslint-parser with the `typescript` + `jsx` syntax plugins.
 * @typescript-eslint/parser is not an option at the root — it drives the
 * classic `typescript` JS API (peer range <6.1), and the root workspace ships
 * TypeScript 7, which has none. The a11y rules only read JSX syntax, so a
 * syntax-only parse is all they need.
 */
import babelParser from '@babel/eslint-parser';
import jsxA11y from 'eslint-plugin-jsx-a11y';

/** A preset entry at any severity -> the same rule at `'error'`, options kept. */
const toError = (entry) => (Array.isArray(entry) ? ['error', ...entry.slice(1)] : 'error');

const isOff = (entry) => (Array.isArray(entry) ? entry[0] : entry) === 'off';

/** jsx-a11y's strict set (recommended with the tighter options), all as errors. */
const strictRules = Object.fromEntries(
  Object.entries(jsxA11y.flatConfigs.strict.rules)
    .filter(([, entry]) => !isOff(entry))
    .map(([name, entry]) => [name, toError(entry)]),
);

/** Rules outside the strict preset that map straight onto a WCAG 2.2 AA criterion. */
const aaRules = {
  // 2.4.4 Link Purpose — "click here", "link", "more".
  'jsx-a11y/anchor-ambiguous-text': 'error',
  // 1.1.1 / 4.1.2 — an icon-only button or link with no accessible name.
  'jsx-a11y/control-has-associated-label': toError(
    jsxA11y.flatConfigs.recommended.rules['jsx-a11y/control-has-associated-label'],
  ),
  // 4.1.2 — a focusable element hidden from assistive tech.
  'jsx-a11y/no-aria-hidden-on-focusable': 'error',
  // 3.1.2 Language of Parts — lang must be a valid BCP 47 tag.
  'jsx-a11y/lang': 'error',
  // `<StudioChangeRequests role="HOST" />` is a business role, not ARIA —
  // only DOM elements (and the components mapped to them below) are judged.
  'jsx-a11y/aria-role': ['error', { ignoreNonDOM: true }],
  // React Router / MUI links navigate with `to`, not `href`.
  'jsx-a11y/anchor-is-valid': ['error', { components: ['Link'], specialLink: ['to'] }],
};

/**
 * ESLint 9 reports `// eslint-disable-next-line react-hooks/exhaustive-deps`
 * as an ERROR ("Definition for rule … was not found") when the plugin is not
 * loaded — dozens of them across these trees, which would fail this run for a
 * reason that has nothing to do with accessibility.
 * Neither plugin is a root dependency, so rather than install two plugins only
 * to satisfy comments, these namespaces resolve every rule name to a rule that
 * does nothing. Inline
 * `jsx-a11y/*` directives keep working, which `--no-inline-config` would not.
 */
const inertRule = { meta: { schema: false }, create: () => ({}) };
const inertPlugin = { rules: new Proxy({}, { get: () => inertRule }) };

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.astro/**',
      '**/__tests__/**',
      '**/*.cy.*',
      '**/*.{test,spec}.*',
      'portals/crm/open-wa-server/**',
    ],
  },
  {
    name: 'duncit/a11y',
    files: [
      'app/mweb/src/**/*.{tsx,jsx}',
      'portals/*/src/**/*.{tsx,jsx}',
      'packages/*/src/**/*.{tsx,jsx}',
    ],
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-hooks': inertPlugin,
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
          parserOpts: { plugins: ['jsx', 'typescript'] },
        },
      },
    },
    // Unused eslint-disable comments are not ours to report here — the files
    // carry directives for linters this config does not run.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    settings: {
      'jsx-a11y': {
        // MUI's `<Box component="img">` / `<Typography component="h1">` render
        // that element, so the rules judge them as it.
        polymorphicPropName: 'component',
        // jsx-a11y only judges DOM elements. Without this map a clickable
        // `<Box onClick>` (2.1.1) or a nameless `<IconButton>` (4.1.2) is an
        // unknown component and passes silently.
        components: {
          DuncitButton: 'button',
          DuncitIconButton: 'button',
          DuncitRoundButton: 'button',
          Button: 'button',
          IconButton: 'button',
          LoadingButton: 'button',
          Fab: 'button',
          ListItemButton: 'button',
          Link: 'a',
          Box: 'div',
          Stack: 'div',
          Paper: 'div',
          Card: 'div',
          CardContent: 'div',
          Typography: 'p',
          ListItem: 'li',
          TableRow: 'tr',
        },
      },
    },
    rules: { ...strictRules, ...aaRules },
  },
];
