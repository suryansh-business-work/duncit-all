/// <reference types="cypress" />
import { runAccount } from '../../../support/run-account';
import { declineTracking } from '../../../support/ui-apps-3';

/**
 * Error Boundaries — a page that fails is contained to the page. Scenario map:
 * Apps › Error Boundaries ("A failing page shows Duncit Error Boundary with
 * Retry and Report an Issue").
 *
 * Every route is a lazy chunk (app/AppRoutes/lazyPages.ts) rendered inside the
 * page-scope DuncitErrorBoundary (App.tsx), which sits inside a wrapper keyed on
 * the path — so navigating away gives the next page a fresh boundary. The fault
 * injected here is the one production really meets: the page's chunk cannot be
 * fetched. staleChunkReload.ts would normally spend one reload on that, so its
 * once-per-tab guard is set first and the boundary answers at once. Report an
 * issue files a BUG app feedback naming the crash reference only for a
 * signed-in member (components/ErrorBoundary.tsx); that feedback is answered
 * here by a stand-in so no report reaches the team's channel, and its request
 * is what is checked.
 */

/** staleChunkReload.ts RELOAD_GUARD_KEY — "this tab already reloaded for a missing chunk". */
const RELOAD_GUARD_KEY = 'duncit.staleChunkReloaded';

interface FeedbackInput {
  category: string;
  message: string;
  source_screen?: string | null;
}

/** The named page chunk never arrives, as after a deploy or on a dropped connection. */
function breakChunk(page: string): void {
  cy.intercept({ method: 'GET', url: `**/assets/${page}-*.js` }, { forceNetworkError: true }).as('brokenChunk');
  cy.on('window:before:load', (win) => {
    win.sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
  });
}

/** Answer SubmitAppFeedback without posting to Slack, keeping the request to check; counts what was filed. */
function standInForFeedback(): { filed: number } {
  const seen = { filed: 0 };
  cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
    if ((req.body as { operationName?: string }).operationName !== 'SubmitAppFeedback') return;
    seen.filed += 1;
    req.alias = 'feedback';
    req.reply({ data: { submitAppFeedback: { ok: true, channel: 'e2e', ts: '0', __typename: 'AppFeedbackResult' } } });
  });
  return seen;
}

describe('Error boundary on a failing page', () => {
  const account = runAccount();

  beforeEach(() => {
    declineTracking();
  });

  it('EB-01 a page that cannot load shows the Duncit fallback inside the page; the app around it keeps working', () => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    breakChunk('FaqsPage');
    cy.visitApp('/faqs');
    cy.wait('@brokenChunk');
    cy.byTestId('error-boundary-fallback').should('be.visible');
    cy.byTestId('error-boundary-retry').should('be.visible');
    cy.byTestId('error-boundary-report').should('be.visible');
    cy.byTestId('faqs-screen').should('not.exist');
    cy.byTestId('bottom-nav').should('be.visible');
    cy.byTestId('tab-bar-HomeTab').click();
    cy.location('pathname').should('eq', '/');
    cy.byTestId('error-boundary-fallback').should('not.exist');
  });

  it('EB-02 Report an issue, signed in, files one BUG report naming the crash reference and the route', () => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    breakChunk('FaqsPage');
    const feedback = standInForFeedback();
    cy.visitApp('/faqs');
    cy.byTestId('error-boundary-report').click();
    cy.wait('@feedback').then(({ request }) => {
      const input = (request.body as { variables: { input: FeedbackInput } }).variables.input;
      expect(input.category).to.equal('BUG');
      expect(input.message).to.contain('Route: /faqs');
      const reference = /Reference: (\S+)/.exec(input.message)?.[1];
      expect(reference, 'the report names the crash reference').to.be.a('string').and.not.be.empty;
      cy.byTestId('error-boundary-fallback').should('contain.text', reference);
    });
    cy.byTestId('error-boundary-report').should('not.exist');
    cy.wrap(feedback).its('filed').should('eq', 1);
  });

  it('EB-03 signed out, Report an issue is logged only — no feedback is filed without a session', () => {
    cy.clearAuth();
    breakChunk('LoginPage');
    const feedback = standInForFeedback();
    cy.visitApp('/login');
    cy.wait('@brokenChunk');
    cy.byTestId('error-boundary-fallback').should('be.visible');
    cy.byTestId('error-boundary-report').click();
    cy.byTestId('error-boundary-report').should('not.exist');
    cy.wrap(feedback).its('filed').should('eq', 0);
  });
});
