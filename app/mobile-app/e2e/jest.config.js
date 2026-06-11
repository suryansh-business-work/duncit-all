/** @type {import('jest').Config} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.e2e.ts'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  setupFilesAfterEach: ['<rootDir>/e2e/setup.ts'],
  verbose: true,
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { configFile: './e2e/babel.config.js' }],
  },
};
