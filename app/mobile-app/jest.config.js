/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // `__tests__/e2e/` holds the Cypress (Expo web) suite — jest's default
  // testMatch would otherwise pick those specs up and run them in jsdom.
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/__tests__/e2e/', '/android/', '/ios/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|react-native-worklets|tamagui|@tamagui/.*|moti|rn-tourguide|@floating-ui/react-native|react-native-gifted-charts|gifted-charts-core))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Linked workspace packages (e.g. @duncit/geo) live outside this app's
    // node_modules, so babel-jest's injected runtime helpers can't be resolved
    // from there — pin them to this app's own @babel/runtime.
    '^@babel/runtime/(.*)$': '<rootDir>/node_modules/@babel/runtime/$1',
    // @duncit/datetime is compiled from its own SOURCE, so its `date-fns` peer
    // resolves by walking up from packages/datetime/ — which finds nothing in
    // CI, where only app/mobile-app is installed (npm ci).
    // Both are pinned to the app's CJS entry EXPLICITLY. Pointing at the package
    // directory (or adding it via modulePaths) bypasses package.json "exports"
    // and loads the ESM build, which jest cannot parse — that broke 71 suites.
    // Only bare specifiers are used anywhere, so no subpath mapping is needed.
    '^date-fns$': '<rootDir>/node_modules/date-fns/index.cjs',
    // date-fns-tz v3's CJS build requires subpaths like `date-fns/format`, and
    // jest's resolver ignores package.json "exports" — so those land on the ESM
    // .js file and blow up. Pin subpaths to their .cjs twin.
    '^date-fns/([^.]+)$': '<rootDir>/node_modules/date-fns/$1.cjs',
    '^date-fns-tz$': '<rootDir>/node_modules/date-fns-tz/dist/cjs/index.js',
    // @duncit/utils' `require` condition points at its gitignored dist/ build —
    // pin jest straight at the TS SOURCE entry (babel-jest transforms it), the
    // same code Metro bundles via the `import` condition.
    '^@duncit/utils$': '<rootDir>/../../packages/utils/src/index.ts',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.{ts,tsx}',
    '!src/types/**',
    '!src/utils/test-utils.tsx',
    // Codegen output — not hand-written, validated by the compiler.
    '!src/generated/**',
    // Pure navigation wiring — exercised at runtime, not in unit tests (typechecked).
    '!src/navigation/RootNavigator.tsx',
    '!src/navigation/MainTabs.tsx',
    '!src/navigation/navigationRef.ts',
    // Platform `.web` variants — jest runs the native platform, so these shims
    // (which mirror their tested native counterparts) are never loaded here.
    '!src/**/*.web.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
