import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['__tests__/**/*.test.{ts,mjs}'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['regex.mjs'],
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
    },
  },
});
