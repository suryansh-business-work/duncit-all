import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Unit specs live in __tests__/unit-tests; the lcov is what SonarQube reads.
// main.tsx only mounts the portal and is outside Sonar's coverage scope too.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./__tests__/unit-tests/setup.ts'],
    include: ['__tests__/unit-tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx'],
    },
  },
});
