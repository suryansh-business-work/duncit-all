import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The same dedupe every portal's vite config carries. Without it a second
  // copy of react loads under test, MUI and the translator resolve against a
  // context nothing populated, and every `t()` renders empty — which
  // reads as "the label is missing" rather than "there are two Reacts".
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      'react-router',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/system',
    ],
  },
  test: {
    environment: 'jsdom',
    globals: false,
    // Two homes on purpose: the consoles that MOVED here keep their tests
    // co-located beside the code (so a test's `../Subject` import still
    // resolves and no relative depth had to be rewritten), while the package's
    // own suites live under __tests__/.
    include: ['__tests__/**/*.test.{ts,tsx}', 'src/**/__tests__/**/*.test.{ts,tsx}'],
    // Every suite runs. Seven admin suites that once arrived broken (and sat here
    // excluded) were re-run and pass against the current sources; ClubsTable only
    // needed its column list brought up to date with the Visibility column.
    exclude: ['node_modules/**'],
    setupFiles: ['./__tests__/setup.ts'],
    // Eighteen jsdom files on a many-core Windows box spawn a fork per core and
    // the pool dies (ERR_IPC_CHANNEL_CLOSED) before a single test reports. Four
    // is plenty for a suite this quick, and a no-op on the small CI runners —
    // the same fix @duncit/utils carries for the same reason.
    maxWorkers: 4,
    coverage: {
      provider: 'v8',
      // Vitest writes NO coverage report when a test fails (reportOnFailure
      // defaults to false), so one red suite would delete this workspace's lcov
      // and SonarQube would read the silence as 0%.
      reportOnFailure: true,
      // lcov is what SonarQube reads (sonar.javascript.lcov.reportPaths).
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**'],
      // Pure re-export barrel and the gql document strings — nothing executable.
      exclude: ['src/index.ts', 'src/**/*.d.ts', 'src/**/counts.ts'],
      // RATCHET, not a target — raise as suites arrive, never lower.
      //
      // These are the consoles' OWN suites, which moved in with them from the
      // onboarding portal — 95 tests across 18 files, covering the venues,
      // hosts and club-admins consoles. Statements sit low because 5,427 lines
      // include screens whose tests did not exist in the portal either;
      // branches are near-total because what IS covered — the forms, the
      // validation, the tables — is covered thoroughly.
      //
      // Functions went 72 -> 67 when hosts and club-admins arrived: more
      // source, same suites. That is the ratchet working, not slipping.
      //
      // The Shared packages gate enforces whatever is written here, so a number
      // above the real coverage reds the build for everyone.
      //
      // 2026-09-10 — re-pinned to the floor, not the ceiling.
      //
      // The gate had been red on staging on the thresholds ALONE (all 283
      // tests pass): the venues, hosts, club-admins and pods consoles all
      // landed here inside a fortnight, thousands of lines each, carrying only
      // the suites they had in the portals they came from. Coverage fell
      // because the denominator grew, not because anything was lost.
      //
      // These numbers are the LOCAL (Windows) reading, which counts a larger
      // denominator than CI does and therefore always reports lower — CI sees
      // roughly 20 / 77 / 54 for the same tree. Pinning to the pessimistic
      // side is deliberate: pinned to the CI number, every console commit a
      // peer lands reds the build for everyone else before its suites arrive.
      //
      // This is DEBT, recorded rather than hidden. Raise it back as the paused
      // suites return — the consoles need their own, not the portals’ leftovers.
      //
      // 2026-09-10, later — RAISED, because the consoles now have their own.
      //
      // 149 tests arrived for the code the venues/hosts/club-admins editors and
      // the change log are actually made of: the record <-> form mappers, the
      // three Zod schemas, both column sets, the change-log columns and cells,
      // and the shared StatusFields / PayoutFields / Fact / useConsoleAccess /
      // useMediaPicker. Local reading went 14.44 / 74.74 / 49.17 / 14.44 ->
      // 21.9 / 79.91 / 58.99 / 21.9 across 432 tests.
      //
      // Branches moved MOST, and that is the interesting number: the first pass
      // of those tests DROPPED branch coverage to 73.32%, because covering a file
      // for the first time also makes its branches countable. What fixed it was
      // deleting the unreachable ones — the mappers carried `?? ''` on fields the
      // query selects as String!, which is dead code wearing caution. 63 branches
      // left the denominator that way.
      //
      // Still the LOCAL (pessimistic) reading, and still pinned a couple of points
      // under it on purpose: CI counts a smaller denominator and reads higher, and
      // the slack is what stops the next console commit reding the build for
      // everyone before its own suites land.
      //
      // 2026-10-12 — RAISED again: the seven suites that sat excluded as "broken"
      // were re-run and pass, and the pods, club-admins, venues and hosts editors
      // and detail pages got real suites. Local reading is now 80.3 / 95.3 / 89.8 /
      // 80.3; pinned a few points under it for the same Windows-vs-CI reason.
      thresholds: { statements: 75, branches: 92, functions: 85, lines: 75 },
    },
  },
});
