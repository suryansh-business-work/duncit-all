import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      provider: 'v8',
      // Vitest writes NO coverage report when a test fails (reportOnFailure defaults
      // to false), so one red suite deleted this whole workspace's lcov and SonarQube
      // read the silence as 0%.
      reportOnFailure: true,
      // lcov is what SonarQube reads (sonar.javascript.lcov.reportPaths).
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/vite-env.d.ts',
        'src/main.tsx', // app bootstrap: mountPortal side-effect, no unit surface
        'src/apollo.ts', // thin Apollo client factory
        'src/theme.ts', // pure re-export barrel of @duncit/theme
      ],
    },
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.form.cy.{ts,tsx}', 'src/**/__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    server: {
      deps: {
        inline: [/@mui/, /react-quill/],
      },
    },
  },
});
