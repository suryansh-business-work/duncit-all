import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      provider: 'v8',
      // lcov is what SonarQube reads (sonar.javascript.lcov.reportPaths).
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
      include: ['src/**/*.{ts,tsx}'],
      // main.tsx is the bootstrap entry (DOM mount + font/side-effect imports);
      // it carries no unit-testable logic and is coverage-excluded in Sonar too.
      exclude: ['src/**/*.d.ts', 'src/vite-env.d.ts', 'src/main.tsx'],
    },
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
