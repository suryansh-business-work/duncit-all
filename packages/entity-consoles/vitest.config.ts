import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      // Vitest writes NO coverage report when a test fails (reportOnFailure
      // defaults to false), so one red suite would delete this workspace's lcov
      // and SonarQube would read the silence as 0%.
      reportOnFailure: true,
      // lcov is what SonarQube reads (sonar.javascript.lcov.reportPaths).
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**'],
      // Pure re-export barrel and the gql document strings — nothing executable.
      exclude: ['src/index.ts', 'src/**/*.d.ts', 'src/**/counts.ts'],
      // RATCHET, not a target — raise as suites arrive, never lower.
      //
      // These are the venues console's OWN suites, which moved in with it from
      // the onboarding portal (45 tests across 10 files). Statements sit low
      // because the console's 3,771 lines include screens whose tests did not
      // exist there either; branches and functions are high because what IS
      // covered — the forms, the validation, the tables — is covered well.
      //
      // The Shared packages gate enforces whatever is written here, so a number
      // above the real coverage reds the build for everyone.
      thresholds: { statements: 23, branches: 87, functions: 72, lines: 23 },
    },
  },
});
