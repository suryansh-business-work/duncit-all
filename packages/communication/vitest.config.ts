import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // lcov is what SonarQube reads (sonar.javascript.lcov.reportPaths).
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
});
