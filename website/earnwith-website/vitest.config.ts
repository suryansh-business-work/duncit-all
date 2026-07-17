import { defineConfig } from 'vitest/config';

// Astro `.astro` files are declarative markup (globally coverage-excluded).
// The only unit-testable logic on this site is the build-time data layer under
// src/lib (GraphQL fetchers + fallback/grouping mappers), so coverage is scoped
// to that — pages, markup and static config are excluded.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/lib/**', 'src/utils/**'],
      exclude: ['src/pages/**', '**/*.astro', '**/*.config.*', 'src/env.d.ts'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
