import type { RunAccount } from '../../support/run-account';
import { PUBLIC_FLAGS_API, PUBLIC_LOCALES_API, openSignedIn, runPasswordNow } from '../../support/ui-shell';
import { gqlRaw, staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Language switch: the profile page's LANGUAGE section
 * (ProfileLanguage) is drawn only when the `language_preference` flag is on AND
 * the platform has at least two active locales — no dead control before
 * languages are set up. The scenario reads both public answers from staging
 * and asserts the page agrees with them, whichever way staging is configured.
 *
 * Not driven: actually switching language (it needs the flag on with a second
 * locale, and it changes the copy every later spec asserts in English) and the
 * save-failure alert.
 */

describe('Portal Shell · Language switch (Support, run account)', () => {
  let account: RunAccount;
  let shown = false;

  before(() => {
    account = staffAccount();
    gqlRaw<{ publicFeatureFlags: { key: string; enabled: boolean }[] }>('support', PUBLIC_FLAGS_API, {}, null).then((flags) =>
      gqlRaw<{ publicLocales: { code: string }[] }>('support', PUBLIC_LOCALES_API, {}, null).then((locales) => {
        const flag = flags.data?.publicFeatureFlags.find((row) => row.key === 'language_preference');
        shown = flag?.enabled === true && (locales.data?.publicLocales.length ?? 0) >= 2;
      }),
    );
  });

  it('LS-01 the profile shows the language control exactly when the flag is on and two locales are active', () => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    cy.interceptOperation('PublicLocales');
    cy.interceptOperation('PublicFeatureFlags');
    openSignedIn('support', '/profile');
    // Both answers are in before the absence of the control means anything.
    cy.wait(['@PublicLocales', '@PublicFeatureFlags']);
    cy.byTestId('profile-roles').should('be.visible');
    if (shown) {
      cy.byTestId('profile-language').should('be.visible').find('[data-testid="language-select"]').should('exist');
    } else {
      cy.byTestId('profile-language').should('not.exist');
    }
  });
});
