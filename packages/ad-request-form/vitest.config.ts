import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}', '__tests__/**/*.test.{ts,tsx}'],
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
      // Co-located *.test.ts files sit under src/, so they land inside `include`
      // and measure themselves. They do not inflate the figure (a test file is
      // fully executed), but they do not belong in the denominator either.
      exclude: ['src/index.ts', 'src/**/*.d.ts', 'src/**/*.test.{ts,tsx}'],
      // This package reached 100% without a threshold to hold it there, which
      // means nothing would have caught it slipping. Now something does.
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
    },
  },
});
