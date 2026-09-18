/**
 * Accessibility lint for the native app — BLOCKING (WCAG 2.2 AA).
 *
 * Kept out of .eslintrc.js on purpose, so the a11y rules have one home and
 * one report (the A11Y status comment). `npm run lint:a11y` runs this file
 * (eslint --no-eslintrc -c .eslintrc.a11y.js --max-warnings 0), and every rule
 * is an error: the count reached zero, so a new finding fails CI rather than
 * joining a backlog. docs/accessibility.md holds the checklist behind it.
 *
 * It turns on eslint-plugin-react-native-a11y's `all` preset
 * (has-accessibility-hint excepted, see below) plus one rule of our own for
 * the gap that plugin cannot see — see PRESSABLE_WITHOUT_ROLE.
 */
const a11y = require('eslint-plugin-react-native-a11y');

const toError = (entry) => (Array.isArray(entry) ? ['error', ...entry.slice(1)] : 'error');

/**
 * The plugin only knows React Native's own touchables (`Pressable`,
 * `Touchable*`). A Tamagui stack or text with `onPress` is a tap target it
 * never judges, and without a role VoiceOver / TalkBack reads it as plain
 * content that cannot be activated (4.1.2 Name, Role, Value). So a raw
 * primitive with a press handler must say what it is: `role` /
 * `accessibilityRole`, or `accessible={false}` for a container that only
 * blocks or forwards touches. A spread may carry the role, so it is trusted.
 * Wrapper components (DuncitButton, PressScale, …) set their role inside.
 */
const PRESSABLE_WITHOUT_ROLE = {
  selector: [
    'JSXOpeningElement[name.name=/^(XStack|YStack|ZStack|Stack|View|Text|Paragraph|SizableText|Image|AppImage)$/]',
    ':has(JSXAttribute[name.name=/^on(Long)?Press$/])',
    ':not(:has(JSXAttribute[name.name=/^(role|accessibilityRole|accessible)$/]))',
    ':not(:has(JSXSpreadAttribute))',
  ].join(''),
  message:
    'A pressable primitive needs a role (role="button" / accessibilityRole), or accessible={false} when it only blocks touches. See docs/accessibility.md.',
};

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
  // fail this run for a reason that has nothing to do with accessibility.
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
  rules: {
    ...Object.fromEntries(
      Object.entries(a11y.configs.all.rules).map(([name, entry]) => [name, toError(entry)]),
    ),
    // Off: it demands a hint on every labelled element, which contradicts the
    // native checklist in docs/accessibility.md (hints only where the result is
    // not obvious).
    'react-native-a11y/has-accessibility-hint': 'off',
    'no-restricted-syntax': ['error', PRESSABLE_WITHOUT_ROLE],
  },
};
