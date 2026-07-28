/// <reference types="cypress" />

type CoverageMap = Record<string, unknown>;

/**
 * Browser half of the istanbul coverage capture (see `../coverage-tasks.ts`).
 * After every test the instrumented `window.__coverage__` is shipped to the
 * `saveCoverage` node task, which persists it to `.nyc_output`.
 *
 * A full page reload resets the in-page counter, so a spec that visits more
 * than once loses the earlier page's data — same caveat the Playwright fixture
 * carried. Every spec here visits once and then navigates via the SPA router.
 *
 * The read and the guard MUST live in the same `.then`. Splitting them
 * (`.then(win => win.__coverage__).then(coverage => …)`) looks equivalent but
 * is not: a `.then` callback that returns `undefined` makes Cypress yield the
 * PREVIOUS subject, so on an uninstrumented bundle (`VITE_COVERAGE` unset,
 * which is how `build:e2e` + `pnpm preview` runs in CI) the second callback
 * received the `Window` itself, passed the non-empty check and handed a
 * circular object to `cy.task` — "Converting circular structure to JSON" in
 * every spec's `after each` hook.
 */
afterEach(() => {
  cy.window({ log: false }).then((win) => {
    const coverage = (win as Cypress.AUTWindow & { __coverage__?: CoverageMap }).__coverage__;
    if (coverage && Object.keys(coverage).length > 0) {
      cy.task('saveCoverage', coverage, { log: false });
    }
  });
});

export {};
