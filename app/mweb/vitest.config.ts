import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // lottie-web reaches for canvas getContext at IMPORT time and jsdom has
      // none, so every module transitively importing it throws before a line of
      // it can be measured. Eight of mWeb’s modules died this way, including
      // App.tsx, PodDetailsPage and the whole checkout chain. Two suites already
      // carried their own vi.mock for it; this is that fix in one place.
      'lottie-react': fileURLToPath(new URL('./test/stubs/lottie-react.tsx', import.meta.url)),
    },
  },
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
