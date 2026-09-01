import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      // Vitest writes NO coverage report when a test fails, so one red suite
      // would delete this workspace's lcov and SonarQube would read the
      // silence as 0%.
      reportOnFailure: true,
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**'],
      // A type-only module is erased by the compiler and vitest cannot execute an
      // Astro component at all, so neither has a line of its own to cover.
      exclude: ['src/index.ts', 'src/mui/index.ts', 'src/**/*.d.ts', 'src/**/types.ts', 'src/**/*.astro'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
