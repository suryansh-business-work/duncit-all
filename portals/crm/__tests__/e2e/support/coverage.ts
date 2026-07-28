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
  cy.window({ log: false })
    .then((win) => (win as Cypress.AUTWindow & { __coverage__?: CoverageMap }).__coverage__)
    .then((coverage) => {
      if (coverage && Object.keys(coverage).length > 0) {
        cy.task('saveCoverage', coverage, { log: false });
      }
    });
});

export {};
