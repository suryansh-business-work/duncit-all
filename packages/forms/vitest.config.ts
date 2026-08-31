import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      // Vitest writes NO coverage report when a test fails (reportOnFailure defaults
      // to false), so one red suite deleted this whole workspace's lcov and SonarQube
      // read the silence as 0%.
      reportOnFailure: true,
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**'],
      // A type-only module is erased by the compiler, so the file that reaches
      // the runtime is empty and every line of the source reads as uncovered.
      exclude: ['src/index.ts', 'src/**/*.d.ts', 'src/**/index.ts', 'src/schemas/translate.ts'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
