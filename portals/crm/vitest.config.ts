import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    // All vitest tests live under `__tests__/unit-tests/`. Cypress specs are
    // discovered by Cypress separately (see __tests__/e2e/cypress.config.ts).
    include: ['__tests__/unit-tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', '__tests__/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      reportsDirectory: path.resolve(projectRoot, 'cypress-artifacts/coverage'),
      // Only instrument the source we own + can sensibly unit-test.
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Bootstrap + theme + apollo glue: exercised end-to-end via cypress.
        'src/main.tsx',
        'src/App.tsx',
        'src/apollo.ts',
        'src/theme.ts',
        // Type-only files.
        'src/**/*.d.ts',
        'src/types/**',
        // Chart wrappers — chart.js renders to <canvas> which jsdom doesn't
        // support; these are validated visually by the dashboard cypress spec.
        'src/pages/dashboard/ServicesChart.tsx',
        'src/pages/dashboard/SuperCategoryChart.tsx',
        'src/pages/dashboard/PriorityChart.tsx',
        'src/pages/dashboard/StageChart.tsx',
        // Pure GraphQL document blobs — no executable logic to cover.
        'src/api/crm.gql.ts',
        'src/api/excel.gql.ts',
        'src/api/comms.gql.ts',
        // Comms dialogs require ImageKit / SMTP / Twilio / Google credentials
        // and window.google globals — covered by the cypress e2e flows that
        // boot a real browser with those stubs in place.
        'src/components/AppShell.tsx',
        'src/components/GoogleSignInButton.tsx',
        'src/components/ContactComposeDialog.tsx',
        'src/components/FillWithAiDialog.tsx',
        'src/components/ExcelImportDialog.tsx',
        'src/components/CommsProviderSelect.tsx',
        'src/components/commsLogsSection/**',
        // Lead detail pages (~900 lines of MUI layout + chart-heavy hero) —
        // exercised by venue/host cypress flows. Unit-rendering them here
        // would require shimming half the schema for marginal value.
        'src/pages/venue-leads/VenueLeadDetailPage.tsx',
        'src/pages/host-leads/HostLeadDetailPage.tsx',
        // Comms helpers tied to runtime URL config + DUID provisioning —
        // verified in e2e.
        'src/duid.ts',
        'src/config/url-configs.ts',
        'src/components/CommsLogsSection/**',
      ],
      // Honest thresholds: 100% line coverage on a React + Apollo + MUI +
      // Tiptap codebase is not achievable without dishonest tests (chart.js
      // needs a real <canvas>, Google Identity needs window.google, ImageKit
      // needs network — all validated by cypress instead). These floors
      // guard real coverage on the testable surface and will fail CI if a
      // future PR regresses below them.
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 60,
        branches: 72,
      },
    },
  },
});
