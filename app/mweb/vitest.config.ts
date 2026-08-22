import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [react()],
  // The app reads its own version from this compile-time constant (rule 33).
  // vite.config.ts defines it for the build; without the same line here every
  // component that shows the version threw "__APP_VERSION__ is not defined"
  // under test, and each suite had to stub the global for itself.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
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
      exclude: ['src/**/*.d.ts', 'src/vite-env.d.ts'],
    },
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.form.cy.{ts,tsx}', 'src/**/__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    server: {
      deps: {
        inline: [/@mui/, /react-quill/, /slick-carousel/, /react-slick/],
      },
    },
  },
});
