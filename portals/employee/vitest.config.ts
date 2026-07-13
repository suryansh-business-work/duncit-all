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
        // Bootstrap + theme + apollo glue — exercised end-to-end, not in jsdom.
        'src/main.tsx',
        'src/App.tsx',
        'src/apollo.ts',
        'src/theme.ts',
        'src/ColorModeContext.tsx',
        // Type-only files + test files themselves.
        'src/**/*.d.ts',
        'src/**/*.types.tsx',
        'src/**/*.{cy,test,spec}.{ts,tsx}',
        // Shell / sidebar / Google-Identity glue needs window.google + the live
        // app frame — validated by the console e2e flows, not unit-rendered here.
        'src/components/AppShell.tsx',
        'src/components/AppSidebar.tsx',
        'src/components/GoogleSignInButton.tsx',
        // Runtime URL/DUID config tied to env + cross-console redirects.
        'src/config/url-configs.ts',
        'src/duid.ts',
        // Apollo error link + the login page (renders @duncit/user-context's
        // LoginScreen + drives the auth mutation/redirect) — covered by e2e.
        'src/utils/apolloErrorLink.ts',
        'src/pages/LoginPage.tsx',
      ],
      // Honest floors (match the established portals): 100% line coverage on a
      // React + Apollo + MUI codebase needs dishonest tests; these guard real
      // coverage on the testable surface and fail CI on regressions.
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 60,
        branches: 72,
      },
    },
  },
});
