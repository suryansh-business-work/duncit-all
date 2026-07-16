import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{cy,test,spec}.{ts,tsx}'],
    css: false,
    server: { deps: { inline: [/@mui/] } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // App bootstrap — mounts the portal into the DOM (window.google + live frame).
        'src/main.tsx',
        // Thin Apollo client factory (graphqlUrl + getToken wiring only).
        'src/apollo.ts',
        // Runtime URL config tied to import.meta.env.DEV — no unit-testable logic.
        'src/config/url-configs.ts',
        // Static per-portal config data (no business logic).
        'src/config/app-config.ts',
        // Ambient type-declaration + type-only files.
        'src/**/*.d.ts',
        'src/**/*.types.{ts,tsx}',
        // Test files themselves.
        'src/**/*.{cy,test,spec}.{ts,tsx}',
      ],
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
});
