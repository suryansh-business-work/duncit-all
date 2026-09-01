import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    // Vitest's 5s default is sized for a unit test. These suites mount the whole
    // PromptLibraryView over MockedProvider and drive MUI dialogs through
    // userEvent, which is under a second here and over five on a two-core CI
    // runner: the AI-tab add/delete test failed with "Test timed out in 5000ms"
    // on main while passing locally in 748ms. Same budget as pod-form and shell,
    // which render at the same scale.
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      // Vitest writes NO coverage report when a test fails (reportOnFailure defaults
      // to false), so one red suite deleted this whole workspace's lcov and SonarQube
      // read the silence as 0%.
      reportOnFailure: true,
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
      include: ['src/**'],
      exclude: ['src/**/index.ts', 'src/**/*.d.ts'],
    },
  },
});
