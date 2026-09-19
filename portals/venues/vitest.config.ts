import { defineConfig } from 'vitest/config';

// Unit specs live in __tests__/unit-tests; the lcov is what SonarQube reads.
// main.tsx only mounts the portal and is outside Sonar's coverage scope too.
export default defineConfig({
  test: {
    include: ['__tests__/unit-tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx'],
    },
  },
});
