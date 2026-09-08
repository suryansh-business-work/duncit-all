// Loaded before every spec via cypress.config.ts > e2e.supportFile.
import './commands';

/**
 * Where each scenario begins and ends, for the clips the Slack thread shows.
 *
 * Sent as tasks rather than read from Cypress's own results, because Cypress
 * 13 removed the per-test video offsets from `after:spec`. Both hooks are
 * `function`s: `this.currentTest` is Mocha's, and an arrow would lose it.
 */
const scenarioTitle = () => Cypress.currentTest.titlePath.join(' › ');

beforeEach(() => {
  cy.task('scenario:start', { spec: Cypress.spec.absolute, title: scenarioTitle() }, { log: false });
});

afterEach(function () {
  cy.task(
    'scenario:end',
    { spec: Cypress.spec.absolute, title: scenarioTitle(), state: this.currentTest?.state ?? 'unknown' },
    { log: false },
  );
});
