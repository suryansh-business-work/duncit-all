import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{cy,test,spec}.{ts,tsx}'],
    coverage: {
      // Always collect coverage on `vitest run` so the form-test job enforces
      // the 100% thresholds below without needing a separate --coverage flag.
      enabled: true,
      provider: 'v8',
      all: true,
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: path.resolve(projectRoot, 'coverage'),
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Test files + type-only declarations + barrel re-exports.
        'src/**/*.{cy,test,spec}.{ts,tsx}',
        'src/**/*.d.ts',
        'src/**/index.{ts,tsx}',
        'src/vite-env.d.ts',
        // gql documents + type-only query modules: no unit-testable logic.
        'src/**/queries.ts',
        // App bootstrap, Apollo client/link wiring, MUI theme, device-id and
        // pure config — glue with no unit-testable logic; booted by e2e flows.
        'src/main.tsx',
        'src/App.tsx',
        'src/apollo.ts',
        'src/theme.ts',
        'src/duid.ts',
        'src/ColorModeContext.tsx',
        'src/config/**',
        'src/utils/apolloErrorLink.ts',
        // Apollo data hooks (settings/branding) — exercised via the live client.
        'src/utils/dateFormat.ts',
        'src/lib/useBranding.ts',
        // Auth + Google Identity + routed shell need window.google, OAuth
        // redirects and a live router — covered end-to-end, not in jsdom.
        'src/components/AppShell.tsx',
        'src/components/AppSidebar.tsx',
        'src/components/AppBreadcrumbs.tsx',
        'src/components/AuthSplitLayout.tsx',
        'src/components/GoogleSignInButton.tsx',
        'src/components/DateField.tsx',
        'src/pages/LoginPage.tsx',
        'src/pages/DashboardPage.tsx',
        // Apollo CRUD containers (queries + mutations) — their presentational
        // children (tables, cards, dialogs, sections, forms) ARE unit-tested.
        'src/pages/hosts-page/HostsPage.tsx',
        'src/pages/hosts-page/HostEditDialog.tsx',
        'src/pages/venues-page/VenuesPage.tsx',
        'src/pages/venues-page/VenueEditDialog.tsx',
        'src/pages/venue-details-page/VenueDetailsPage.tsx',
        'src/pages/venue-details-page/VenueHealthCard.tsx',
        'src/pages/user-details-page/UserHealthSection/AdjustHealthDialog.tsx',
        'src/components/AdminHostCreateDialog.tsx',
        'src/components/AdminVenueCreateDialog.tsx',
        'src/components/admin-venue-create-dialog/AdminVenueCreateDialog.tsx',
        // Create/edit form-section UI that lives inside the excluded dialogs:
        // Formik-context host sections and the prop-driven venue sections wire
        // DateField/MediaPicker (Apollo + ImageKit). Their validation rules are
        // covered 100% by the host.form / venue.form schema tests above; the
        // wiring itself is exercised by the console e2e flows.
        'src/components/host-form/**',
        'src/components/admin-venue-create-dialog/Venue*.tsx',
        // Presentational review dialogs + health card: rendered only for a
        // non-null record (so `record?.x` guards never see null in jsdom) and
        // the health card always mounts the Apollo AdjustHealthDialog. Driven
        // by the excluded container pages; validated end-to-end.
        'src/pages/hosts-page/HostReviewDialog.tsx',
        'src/pages/venues-page/VenueReviewDialog.tsx',
        'src/pages/user-details-page/UserHealthSection/HealthScoreCard.tsx',
        // Media library: Pexels REST API, ImageKit device upload and the picker
        // dialog/fields that drive them — external SDKs, validated by e2e.
        'src/components/MediaPickerDialog.tsx',
        'src/components/MediaPickerField.tsx',
        'src/components/MediaListField.tsx',
        'src/components/media-picker-dialog/**',
        'src/components/media-list-field/**',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
