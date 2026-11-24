/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|react-native-svg|react-native-reanimated|react-native-worklets|tamagui|@tamagui/.*))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^crm-telephony$': '<rootDir>/modules/crm-telephony',
    // Linked packages live outside this app's node_modules, so babel's injected
    // helpers and their peers resolve to this app's copies (same pins as the
    // member app, same reasons: CI installs only this app).
    '^@babel/runtime/(.*)$': '<rootDir>/node_modules/@babel/runtime/$1',
    '^date-fns$': '<rootDir>/node_modules/date-fns/index.cjs',
    '^date-fns/([^.]+)$': '<rootDir>/node_modules/date-fns/$1.cjs',
    '^date-fns-tz$': '<rootDir>/node_modules/date-fns-tz/dist/cjs/index.js',
    '^@duncit/utils$': '<rootDir>/../../packages/utils/src/index.ts',
    '^@duncit/datetime$': '<rootDir>/../../packages/datetime/src/index.ts',
    '^zod$': '<rootDir>/node_modules/zod',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'modules/crm-telephony/index.ts',
    '!src/**/*.d.ts',
    '!src/**/index.{ts,tsx}',
    '!src/test-utils.tsx',
    // Codegen output — validated by the compiler, not hand-written.
    '!src/generated/**',
    // Navigation wiring only — exercised at runtime and typechecked.
    '!src/navigation/RootNavigator.tsx',
    '!src/navigation/MainTabs.tsx',
    '!src/navigation/navigationRef.ts',
  ],
  coverageThreshold: {
    global: { branches: 85, functions: 85, lines: 85, statements: 85 },
  },
};
