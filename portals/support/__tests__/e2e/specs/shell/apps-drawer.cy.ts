import type { RunAccount } from '../../support/run-account';
import { PORTAL_FEATURES_API, apiToken, asAccount, openSignedIn, runPasswordNow } from '../../support/ui-shell';
import { staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Apps drawer (the header's nine dots), on Support: the
 * platform tools (tools.tsx), a search over name, description and keywords,
 * and a close that clears the search for next time. The header's apps and chat
 * buttons follow the console's portalMode answer (Admin > Portal App Settings).
 */

interface Features {
  portalMode: { chat_enabled: boolean; apps_enabled: boolean } | null;
}

describe('Portal Shell · Apps drawer (Support, run account)', () => {
  let account: RunAccount;
  let features: Features['portalMode'] = null;

  before(() => {
    account = staffAccount();
    apiToken('support', account).then((token) =>
      asAccount<Features>('support', token, PORTAL_FEATURES_API, { key: 'support' }).then((data) => {
        features = data.portalMode;
        if (features?.apps_enabled === false) {
          throw new Error('The apps drawer is turned off for Support (Admin > Portal App Settings).');
        }
      }),
    );
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
  });

  it('AD-01 the drawer lists the platform tools and searches their names, descriptions and keywords', () => {
    openSignedIn('support', '/');
    cy.byTestId('shell-header-apps').click();
    cy.byTestId('shell-apps-drawer-tool-file-manager').should('contain.text', 'File Manager');
    cy.byTestId('shell-apps-drawer-tool-jump-to-portal').should('contain.text', 'Jump to Portal');
    cy.byTestId('shell-apps-drawer-tool-ask-bot').should('contain.text', 'Ask Bot');
    if (features?.chat_enabled !== false) {
      cy.byTestId('shell-apps-drawer-tool-staff-chat').should('contain.text', 'Chat with a coworker');
    }

    // A keyword (tools.tsx), not part of the name: only the File Manager knows "imagekit".
    cy.byTestId('shell-apps-drawer-search').type('imagekit');
    cy.byTestIdPrefix('shell-apps-drawer-tool-').should('have.length', 1);
    cy.byTestId('shell-apps-drawer-tool-file-manager').should('be.visible');
    // A description word: "request access to the rest" is Jump to Portal's line.
    cy.byTestId('shell-apps-drawer-search').clear().type('request access');
    cy.byTestIdPrefix('shell-apps-drawer-tool-').should('have.length', 1);
    cy.byTestId('shell-apps-drawer-tool-jump-to-portal').should('be.visible');

    cy.byTestId('shell-apps-drawer-search').clear().type('zz-no-tool-zz');
    cy.byTestIdPrefix('shell-apps-drawer-tool-').should('not.exist');
    cy.contains('Nothing matches “zz-no-tool-zz”.').should('be.visible');
  });

  it('AD-02 closing the drawer clears the search, so it reopens with every tool', () => {
    openSignedIn('support', '/');
    cy.byTestId('shell-header-apps').click();
    cy.byTestId('shell-apps-drawer-search').type('bot');
    cy.byTestId('shell-apps-drawer-close').click();
    cy.byTestId('shell-apps-drawer-search').should('not.exist');
    cy.byTestId('shell-header-apps').click();
    cy.byTestId('shell-apps-drawer-search').should('have.value', '').and('be.focused');
    cy.byTestId('shell-apps-drawer-tool-file-manager').should('be.visible');
    cy.byTestId('shell-apps-drawer-tool-jump-to-portal').should('be.visible');
  });
});
