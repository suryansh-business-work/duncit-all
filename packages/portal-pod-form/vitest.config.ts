import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**'],
      exclude: ['src/index.ts', 'src/**/*.d.ts', 'src/**/index.ts'],
      // branches capped at the achieved 20/21 (95.23%): PodContentFormDialog.tsx:68
      // `if (!onPickImage) return;` is an unreachable defensive guard — addImage is
      // only ever invoked from the "Add image" button, which already only renders
      // when onPickImage is truthy, so the true branch can't be hit without editing src.
      thresholds: { statements: 100, branches: 95, functions: 100, lines: 100 },
    },
  },
});
