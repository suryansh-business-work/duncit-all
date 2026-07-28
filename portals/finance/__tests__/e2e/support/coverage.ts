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
 */
afterEach(() => {
  // Read + forward inside ONE `.then`: a `.then` callback that returns
  // `undefined` makes Cypress yield the PREVIOUS subject, so chaining a second
  // `.then` here would hand the AUT `Window` to `cy.task` on an uninstrumented
  // build and blow up with "Converting circular structure to JSON".
  cy.window({ log: false }).then((win) => {
    const coverage = (win as Cypress.AUTWindow & { __coverage__?: CoverageMap }).__coverage__;
    if (coverage && Object.keys(coverage).length > 0) {
      cy.task('saveCoverage', coverage, { log: false });
    }
  });
});

export {};
