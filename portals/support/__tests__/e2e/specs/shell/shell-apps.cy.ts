import type { RunAccount } from '../../support/run-account';
import { PORTAL_FEATURES_API, apiToken, asAccount, openSignedIn, runPasswordNow } from '../../support/ui-shell';
import { staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Shell apps: the header's apps and chat buttons are drawn
 * exactly when the console's `portalMode` (PortalAppFeatures) says so — read
 * here for Support and Legal and compared with the header — and the query
 * fails open, so a console whose answer never arrives keeps both. Picking a
 * tool by its name opens it over the page.
 */

type Features = { portalMode: { chat_enabled: boolean; apps_enabled: boolean } | null };

function headerMatchesFeatures(portal: 'support' | 'legal', account: RunAccount): void {
  apiToken(portal, account).then((token) =>
    asAccount<Features>(portal, token, PORTAL_FEATURES_API, { key: portal }).then(({ portalMode }) => {
      cy.apiPortalLogin(portal, account.email, runPasswordNow(account));
      openSignedIn(portal, '/');
      // An absent row means "everything on" (usePortalAppFeatures ALL_ON).
      cy.byTestId('shell-header-apps').should(portalMode?.apps_enabled === false ? 'not.exist' : 'be.visible');
      cy.byTestId('shell-header-chat').should(portalMode?.chat_enabled === false ? 'not.exist' : 'be.visible');
    }),
  );
}

describe('Portal Shell · Shell apps (Support and Legal, run account)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  it('SA-01 Support draws the apps and chat buttons its portal settings allow', () => {
    headerMatchesFeatures('support', account);
  });

  it('SA-02 Legal draws the apps and chat buttons its own portal settings allow', () => {
    headerMatchesFeatures('legal', account);
  });

  it('SA-03 when the feature answer cannot be fetched, the header keeps both buttons (fails open)', () => {
    cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
      if ((req.body as { operationName?: string } | undefined)?.operationName === 'PortalAppFeatures') {
        req.alias = 'PortalAppFeatures';
        req.reply({ statusCode: 200, body: { errors: [{ message: 'E2E: features unavailable' }] } });
      }
    });
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    openSignedIn('support', '/');
    cy.wait('@PortalAppFeatures');
    cy.byTestId('shell-header-apps').should('be.visible');
    cy.byTestId('shell-header-chat').should('be.visible');
  });

  it('SA-04 a tool found by its name opens over the page without leaving it', () => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    openSignedIn('support', '/tickets');
    cy.byTestId('shell-header-apps').click();
    cy.byTestId('shell-apps-drawer-search').type('Ask Bot');
    cy.byTestIdPrefix('shell-apps-drawer-tool-').should('have.length', 1);
    cy.byTestId('shell-apps-drawer-tool-ask-bot').click();
    cy.byTestId('ask-bot-dialog').should('be.visible');
    cy.location('pathname').should('eq', '/tickets');
  });
});
