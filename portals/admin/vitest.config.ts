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
        // Pure re-export barrels — no conditional logic to cover. Listed
        // individually rather than a `**/index.{ts,tsx}` glob because several
        // `index.tsx` files in this portal (e.g. auto-pods-page/editor,
        // pods-page/pod-editor-page, branding-page) ARE the real component
        // and must stay covered.
        'src/pages/user-details-page/contact-action/index.ts',
        'src/pages/membership/membership-benefit/index.ts',
        'src/pages/pod-plans/pod-plan/index.ts',
        'src/pages/membership/membership-plan/index.ts',
        'src/pages/users-page/create-user/index.ts',
        'src/pages/user-details-page/user-profile/index.ts',
        'src/pages/roles-page/role/index.ts',
        'src/pages/portal-access-page/index.tsx',
        'src/pages/pods-page/complete-pod-dialog/index.tsx',
        'src/pages/membership/index.ts',
        'src/pages/locations-page/location/index.ts',
        'src/pages/categories-page/category/index.ts',
        'src/pages/badges-page/badge/index.ts',
        'src/pages/auto-pods-page/index.tsx',
        'src/pages/approvals-page/index.tsx',
        'src/pages/user-details-page/UserHealthSection/index.ts',
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
