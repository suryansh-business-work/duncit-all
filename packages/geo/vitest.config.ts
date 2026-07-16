import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**'],
      // NOTE: geo's real logic (COUNTRY_OPTIONS, getStatesForCountry, flagForIso,
      // findCountryByName) lives in src/index.ts, so it is deliberately NOT
      // excluded here — the generic barrel exclusion would hide the actual code.
      exclude: ['src/**/*.d.ts'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
