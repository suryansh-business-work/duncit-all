import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['__tests__/**/*.test.{ts,mjs}'],
    coverage: {
      provider: 'v8',
      // Vitest writes NO coverage report when a test fails (reportOnFailure defaults
      // to false), so one red suite deleted this whole workspace's lcov and SonarQube
      // read the silence as 0%.
      reportOnFailure: true,
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      // BOTH entry points. The lockstep suite already requires regex.cjs and
      // calls every validator in it, but listing only the .mjs meant no
      // coverage was ever emitted for the CJS twin — so SonarQube, which
      // analyses the file either way, read it as entirely uncovered.
      include: ['regex.mjs', 'regex.cjs'],
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
    },
  },
});
