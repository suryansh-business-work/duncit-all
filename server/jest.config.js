/** @type {import('jest').Config} */
const tsJest = ['ts-jest', { tsconfig: 'tsconfig.test.json', isolatedModules: true }];

const moduleNameMapper = {
  '^@modules$': '<rootDir>/src/modules/index.ts',
  '^@modules/(.*)$': '<rootDir>/src/modules/$1',
  '^@observability/(.*)$': '<rootDir>/src/observability/$1',
  '^@config/(.*)$': '<rootDir>/src/config/$1',
  '^@services/(.*)$': '<rootDir>/src/services/$1',
  '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
  '^@realtime/(.*)$': '<rootDir>/src/realtime/$1',
  '^@generated/(.*)$': '<rootDir>/src/generated/$1',
  '^@context$': '<rootDir>/src/context.ts',
  '^@test/(.*)$': '<rootDir>/test/$1',
};

const base = {
  testEnvironment: 'node',
  rootDir: '.',
  transform: { '^.+\\.ts$': tsJest },
  moduleNameMapper,
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
};

const dbSetup = ['<rootDir>/test/setup-db.ts'];

module.exports = {
  projects: [
    {
      ...base,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/__tests__/unit-tests/**/*.test.ts'],
    },
    {
      ...base,
      displayName: 'integration',
      testMatch: ['<rootDir>/src/**/__tests__/integration-tests/**/*.test.ts'],
      setupFilesAfterEnv: dbSetup,
      globalSetup: '<rootDir>/test/global-setup.ts',
      globalTeardown: '<rootDir>/test/global-teardown.ts',
    },
    {
      ...base,
      displayName: 'e2e',
      testMatch: ['<rootDir>/src/**/__tests__/e2e/**/*.test.ts'],
      setupFilesAfterEnv: dbSetup,
      globalSetup: '<rootDir>/test/global-setup.ts',
      globalTeardown: '<rootDir>/test/global-teardown.ts',
    },
  ],
  collectCoverageFrom: [
    'src/modules/**/*.ts',
    'src/services/**/*.ts',
    'src/utils/**/*.ts',
    '!src/**/*.schema.ts',
    '!src/**/*.model.ts',
    '!src/**/index.ts',
    '!src/**/__tests__/**',
    '!src/**/*.socket.ts',
    // NOTE: src/modules/platform/tech/tech.service.ts used to be excluded here
    // as "runtime-environment bound, validated via its role-gated resolver, not
    // unit coverage". It now has unit tests that mock os / fs.statfs / the
    // Docker socket and reach 100% on all four metrics, so the exclusion was
    // removed rather than left to hide a file that is genuinely covered.
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/generated/'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text-summary', 'text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
};
