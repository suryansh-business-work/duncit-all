import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const root = path.dirname(fileURLToPath(import.meta.url));
const mock = (file: string) => path.resolve(root, '__tests__/unit-tests/mocks', file);

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The heavy shared @duncit UI/data packages are separately tested; alias
    // them to lightweight stubs so the finance-portal component logic (and every
    // branch) can be driven deterministically. @duncit/utils stays real.
    alias: {
      '@duncit/table': mock('table.tsx'),
      '@duncit/ui': mock('ui.tsx'),
      '@duncit/dialogs': mock('dialogs.tsx'),
      '@duncit/shell': mock('shell.tsx'),
      '@duncit/user-context': mock('user-context.tsx'),
      '@duncit/media-picker': mock('media-picker.tsx'),
      // MUI X pickers → controllable stubs (the real sectioned fields can't be
      // cleared via fireEvent, which blocks the null-date branches).
      '@mui/x-date-pickers/DatePicker': mock('mui-x.tsx'),
      '@mui/x-date-pickers/TimePicker': mock('mui-x.tsx'),
      '@mui/x-date-pickers/LocalizationProvider': mock('mui-x.tsx'),
      '@mui/x-date-pickers/AdapterDateFns': mock('mui-x.tsx'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./__tests__/unit-tests/setup.ts'],
    include: ['src/**/*.{cy,test,spec}.{ts,tsx}', '__tests__/unit-tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', '__tests__/e2e/**'],
    coverage: {
      // istanbul output (json) is merged with the Playwright E2E coverage by nyc
      // so component-level defensive branches the E2E flows can't reach still count.
      provider: 'istanbul',
      all: true,
      reporter: ['text', 'text-summary', 'json', 'lcov'],
      reportsDirectory: './coverage/vitest',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx', // app bootstrap: mountPortal side-effect, no unit surface
        'src/apollo.ts', // thin Apollo client factory
        'src/theme.ts', // pure re-export barrel of @duncit/theme
        'src/config/app-config.ts', // static per-portal config data
        'src/config/url-configs.ts', // static URL config (build-time DEV branch)
        'src/pages/finance/invoice-management-page/types.ts', // type-only + empty-form constant
        'src/pages/finance/startup-dashboard/types.ts', // type-only declarations
        'src/**/*.types.{ts,tsx}', // type-only declarations
        'src/**/*.d.ts',
        'src/**/*.{cy,test,spec}.{ts,tsx}',
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
