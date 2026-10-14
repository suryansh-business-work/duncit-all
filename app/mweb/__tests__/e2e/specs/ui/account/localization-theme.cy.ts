/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';
import { openMenu } from '../../../support/menu-steps';
import { openAccount } from '../../../support/profile-steps';

/**
 * Localization & theme, live on staging. The language picker on /account is
 * drawn only when the `language_preference` flag is on AND the server offers
 * two or more locales (LanguageSection.tsx); the colour mode lives in this
 * browser's storage (`mweb_color_mode`, ColorModeContext.tsx) and is switched
 * from the menu signed in, or from the two-segment toggle on every auth screen.
 */

const LANGUAGE_GATE_QUERY = `query E2eLanguageGate {
  publicFeatureFlags { key enabled }
  publicLocales { code }
}`;

type LanguageGate = {
  publicFeatureFlags: Array<{ key: string; enabled: boolean }>;
  publicLocales: Array<{ code: string }>;
};

const MODE_KEY = 'mweb_color_mode';
const themeSwitch = () => cy.byTestId('sidebar-theme-switch-input');
const storedMode = () => cy.window().its('localStorage').invoke('getItem', MODE_KEY);

/** Flip the menu's dark-mode switch and see the switch and the stored mode agree. */
function flipTheme(toDark: boolean): void {
  themeSwitch().click();
  themeSwitch().should(toDark ? 'be.checked' : 'not.be.checked');
  storedMode().should('eq', toDark ? 'dark' : 'light');
}

describe('UI Localization & theme', () => {
  before(() => {
    signInRunMember();
  });

  it('LT-01 the language picker exists on /account only when it can change something', () => {
    cy.gql<LanguageGate>(LANGUAGE_GATE_QUERY, {}, { token: null }).then((gate) => {
      const flagOn = gate.publicFeatureFlags.some((flag) => flag.key === 'language_preference' && flag.enabled);
      const offered = flagOn && gate.publicLocales.length >= 2;
      openAccount();
      cy.byTestId('comm-preference-entry').should('be.visible');
      cy.byTestId('account-language-section').should(offered ? 'be.visible' : 'not.exist');
    });
  });

  it('LT-02 Dark mode from the menu switches the theme and is kept after a reload', () => {
    openMenu();
    themeSwitch().then(($input) => {
      const wasDark = $input.is(':checked');
      flipTheme(!wasDark);
      openMenu();
      themeSwitch().should(wasDark ? 'not.be.checked' : 'be.checked');
      flipTheme(wasDark);
    });
  });

  it('LT-03 the Light and Dark toggle on the sign-in screen keeps the dark choice', () => {
    cy.clearAuth();
    cy.visitApp('/login');
    cy.byTestId('auth-mode-toggle').should('be.visible');
    cy.byTestId('auth-mode-light').should('contain.text', 'Light');
    cy.byTestId('auth-mode-dark').should('contain.text', 'Dark').click();
    cy.byTestId('auth-mode-dark').should('have.attr', 'aria-pressed', 'true');
    cy.byTestId('auth-mode-light').should('have.attr', 'aria-pressed', 'false');
    storedMode().should('eq', 'dark');
    cy.visitApp('/login');
    cy.byTestId('auth-mode-dark').should('have.attr', 'aria-pressed', 'true');
    cy.byTestId('auth-mode-light').click();
    cy.byTestId('auth-mode-light').should('have.attr', 'aria-pressed', 'true');
    storedMode().should('eq', 'light');
  });
});
