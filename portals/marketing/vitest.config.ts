import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      // lcov is what SonarQube reads (sonar.javascript.lcov.reportPaths).
      reporter: ['text', 'text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts', // type declarations
        'src/vite-env.d.ts', // vite ambient types
        'src/**/*.{test,spec,cy}.{ts,tsx}', // test files, not product code
        'src/main.tsx', // bootstrap entry: side-effect mountPortal call
        'src/apollo.ts', // thin Apollo client factory (createApolloClient wiring)
        'src/config/url-configs.ts', // static, env-driven URL config data
        'src/config/app-config.ts', // static per-portal config data
        'src/**/queries.ts', // gql-document-only (gql tags + type interfaces, no logic)
        'src/pages/notifications-page/notification/notification.types.ts', // pure type re-export
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
    environment: 'jsdom',
    include: [
      'src/**/*.{cy,test,spec}.{ts,tsx}',
      '__tests__/unit-tests/**/*.{test,spec}.{ts,tsx}',
    ],
  },
});
