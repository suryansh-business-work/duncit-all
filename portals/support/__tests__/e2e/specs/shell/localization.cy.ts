import type { RunAccount } from '../../support/run-account';
import { PUBLIC_FLAGS_API, PUBLIC_LOCALES_API, openSignedIn, runPasswordNow } from '../../support/ui-shell';
import { gqlRaw, staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Localization: the taskbar clock tray carries the language
 * switcher whenever the `language_preference` flag is on — even with a single
 * active locale (ClockTray passes `showSingle`), listing every active locale —
 * and drops it, divider and all, when the flag is off. Checked against the
 * public answers staging gives. Switching and the save-failure alert are not
 * driven (see language-switch.cy.ts).
 */

describe('Portal Shell · Localization (Support, run account)', () => {
  let account: RunAccount;
  let flagOn = false;
  let codes: string[] = [];

  before(() => {
    account = staffAccount();
    gqlRaw<{ publicFeatureFlags: { key: string; enabled: boolean }[] }>('support', PUBLIC_FLAGS_API, {}, null).then((flags) => {
      flagOn = flags.data?.publicFeatureFlags.find((row) => row.key === 'language_preference')?.enabled === true;
    });
    gqlRaw<{ publicLocales: { code: string }[] }>('support', PUBLIC_LOCALES_API, {}, null).then((locales) => {
      codes = (locales.data?.publicLocales ?? []).map((row) => row.code);
    });
  });

  it('LO-01 the clock tray offers the language switcher exactly when the flag is on, with every active locale', () => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    cy.interceptOperation('PublicFeatureFlags');
    openSignedIn('support', '/');
    cy.wait('@PublicFeatureFlags');
    cy.byTestId('shell-taskbar-clock').click();
    cy.byTestId('shell-clock-tray').should('be.visible');
    if (!flagOn) {
      cy.byTestId('shell-clock-tray').find('[data-testid="language-select"]').should('not.exist');
      return;
    }
    cy.byTestId('shell-clock-tray').find('[data-testid="language-select"]').click();
    for (const code of codes) cy.byTestId(`locale-option-${code}`).should('exist');
    cy.byTestIdPrefix('locale-option-').should('have.length', codes.length);
    cy.get('body').type('{esc}');
  });
});
