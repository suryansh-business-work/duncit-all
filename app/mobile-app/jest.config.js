/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/e2e-web/', '/android/', '/ios/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|react-native-worklets|tamagui|@tamagui/.*|moti))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Linked workspace packages (e.g. @duncit/geo) live outside this app's
    // node_modules, so babel-jest's injected runtime helpers can't be resolved
    // from there — pin them to this app's own @babel/runtime.
    '^@babel/runtime/(.*)$': '<rootDir>/node_modules/@babel/runtime/$1',
  },
  // Linked workspace packages (@duncit/datetime, @duncit/fallback-icons) are
  // compiled from their own source, so their peer imports (date-fns) resolve
  // by walking up from packages/<name>/ — which finds nothing in CI, where only
  // app/mobile-app is installed (npm ci). Adding this app's node_modules to the
  // search path fixes that while leaving normal package resolution intact:
  // a moduleNameMapper alias to the directory would bypass package.json
  // "exports" and load date-fns v4's ESM build, which jest cannot parse.
  modulePaths: ['<rootDir>/node_modules'],
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
