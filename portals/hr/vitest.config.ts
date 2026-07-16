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
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/vite-env.d.ts'],
    },
    environment: 'jsdom',
    include: ['src/**/*.{cy,test,spec}.{ts,tsx}'],
    // The portal's only local tests (dead login-form folder) moved into shared
    // @duncit packages during the dedup migration.
    passWithNoTests: true,
  },
});
