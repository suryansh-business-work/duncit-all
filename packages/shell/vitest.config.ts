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
      thresholds: {
        statements: 100,
        functions: 100,
        lines: 100,
        // Exactly three defensive branches are unreachable and cannot be covered
        // without editing src/ (out of scope), so branches sit at 99.19% (368/371):
        //   • HeaderSearch.tsx:74 `if (!option) return` — the Autocomplete hard-codes
        //     value={null}; MUI only emits onChange(null) via its clear path, which is
        //     gated on value !== null, so a null option never reaches this guard.
        //   • AppSidebar/nav-items.tsx:66 & :91 `item.children ?? []` — GroupItem is
        //     only rendered by NavNode when children is a non-empty array, so the
        //     `?? []` fallback never runs.
        // A negative threshold caps the number of *uncovered* branches, so any NEW
        // uncovered branch (a 4th) still fails the gate.
        branches: -3,
      },
    },
  },
});
