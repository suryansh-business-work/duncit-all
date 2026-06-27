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
      // Always collect coverage on `vitest run` so CI's form-test job enforces
      // the thresholds below without needing a separate --coverage flag.
      enabled: true,
      provider: 'v8',
      all: true,
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: path.resolve(projectRoot, 'coverage'),
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Test files themselves + type-only declarations.
        'src/**/*.{cy,test,spec}.{ts,tsx}',
        'src/**/*.d.ts',
        // App bootstrap, Apollo client/link wiring, MUI theme and device-id —
        // pure glue with no unit-testable logic; booted by the e2e flows.
        'src/main.tsx',
        'src/App.tsx',
        'src/apollo.ts',
        'src/theme.ts',
        'src/duid.ts',
        'src/config/url-configs.ts',
        'src/utils/apolloErrorLink.ts',
        // Auth + Google Identity + the routed app shell need window.google,
        // OAuth redirects and a live router — covered end-to-end, not in jsdom.
        'src/components/AppShell.tsx',
        'src/components/AppBreadcrumbs.tsx',
        'src/components/AuthSplitLayout.tsx',
        'src/components/GoogleSignInButton.tsx',
        'src/pages/LoginPage.tsx',
        'src/pages/AuthenticationPage.tsx',
        'src/pages/JwtExpirySection.tsx',
        // Apollo CRUD containers (queries + mutations + drawers) — their
        // presentational children (tables, dialogs, forms) ARE unit-tested
        // here; the containers are validated by the console e2e suite.
        'src/pages/environment/index.tsx',
        'src/pages/environment/EnvVariablesTab.tsx',
        'src/pages/environment/PortalMappingTab.tsx',
        'src/pages/environment/PortalEnvDrawer.tsx',
        'src/pages/feature-flags-page/FeatureFlagsPage.tsx',
        'src/pages/portal-modes/index.tsx',
        // Server > Info / Docker are Apollo query containers; their
        // presentational children (StatCard, InfoList, ServerInfoDetails) and
        // helpers (format, queries) ARE unit-tested.
        'src/pages/server/ServerInfoPage.tsx',
        'src/pages/server/DockerPage.tsx',
        // Interactive test panels: real Apollo mutations, Google OAuth/Maps
        // SDKs and <script> injection — exercised by the e2e console flows.
        'src/pages/environment/test-panels/**',
        // Email Templates: Apollo CRUD container + editor hook + mutation
        // dialogs, plus the Monaco-editor pane and its AI button (real browser
        // editor + Apollo mutation) — exercised by the e2e console flows. The
        // presentational children (TemplateList, EditorActionsBar,
        // CreateTemplateForm, PreviewVariablesPane) and helpers (mjmlFormat,
        // queries, form schemas) ARE unit-tested here.
        'src/pages/email-templates-page/EmailTemplatesPage.tsx',
        'src/pages/email-templates-page/useEmailTemplateEditor.ts',
        'src/pages/email-templates-page/CreateTemplateDialog.tsx',
        'src/pages/email-templates-page/SendTestDialog.tsx',
        'src/pages/email-templates-page/MjmlEditorPane.tsx',
        'src/pages/email-templates-page/TemplateEditorPanel.tsx',
        'src/components/MjmlAiButton.tsx',
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
