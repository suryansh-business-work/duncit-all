// Loaded before every spec via cypress.config.ts > e2e.supportFile.
import './commands';

/**
 * Where each scenario begins and ends, for the clips the Slack thread shows
 * (scripts/lib/cypress-scenarios.mjs). `this.currentTest` is Mocha's, so the
 * end hook is a `function`.
 */
const scenarioTitle = () => Cypress.currentTest.titlePath.join(' › ');

// react-native-web raises async errors the scenarios never depend on (fonts,
// video, reanimated, push registration on a browser). The native web suite has
// always kept this contract: app errors are asserted on screen, not inferred.
Cypress.on('uncaught:exception', () => false);

beforeEach(() => {
  cy.task(
    'scenario:start',
    { spec: Cypress.spec.absolute, title: scenarioTitle() },
    { log: false },
  );
  // The app's notification stream and socket are not under test, and would
  // keep re-rendering the page under a spec.
  cy.intercept({ method: 'GET', url: '**/notifications/stream*' }, { statusCode: 204, body: '' });
  cy.intercept('**/socket.io/**', { statusCode: 204, body: '' });
  cy.intercept(/maps\.googleapis\.com|google-analytics|googletagmanager/, {
    statusCode: 200,
    headers: { 'content-type': 'application/javascript' },
    body: '',
  });
  cy.useRunTraffic();
});

afterEach(function () {
  cy.task(
    'scenario:end',
    {
      spec: Cypress.spec.absolute,
      title: scenarioTitle(),
      state: this.currentTest?.state ?? 'unknown',
    },
    { log: false },
  );
});
