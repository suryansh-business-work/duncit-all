/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import { blockQuery, siteBranding, statusCopy, statusFallbackT, visitSite } from '../../../../support/ui-websites';

/**
 * The status page's colour mode (hooks/useColorMode.ts: the system preference
 * until the visitor picks, remembered as status_color_mode), its branding
 * fallback (hooks/useBranding.ts) and its language fallback
 * (i18n/TranslationProvider.tsx over STATUS_BUNDLE).
 */

const emulateColorScheme = (scheme: 'dark' | 'light' | null) =>
  cy.wrap(
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { features: scheme ? [{ name: 'prefers-color-scheme', value: scheme }] : [] },
    }),
    { log: false },
  );

/** A key the bundle would show if a translation were missing everywhere. */
const RAW_KEY = /\bstatus\.(board|report|detail|loading|impact)\.[A-Za-z]+/;

describe('UI Status website · Theme and language', () => {
  let t: Translator['t'];
  let appName: string;

  before(() => {
    statusCopy().then((copy) => {
      t = copy;
    });
    siteBranding().then((branding) => {
      appName = branding.app_name;
    });
  });

  afterEach(() => {
    emulateColorScheme(null);
  });

  it('THEME-01 with a dark system and no saved choice the page opens dark; switching to light is remembered across a reload', () => {
    emulateColorScheme('dark');
    visitSite('status');
    cy.get(`header button[aria-label="${t('status.board.switchToLight')}"]`).should('exist').click();
    cy.get(`header button[aria-label="${t('status.board.switchToDark')}"]`).should('exist');
    cy.window().its('localStorage').invoke('getItem', 'status_color_mode').should('eq', 'light');
    cy.reload();
    cy.get(`header button[aria-label="${t('status.board.switchToDark')}"]`).should('exist');
    cy.window().its('localStorage').invoke('getItem', 'status_color_mode').should('eq', 'light');
  });

  it('THEME-02 the header and tab title follow the live branding', () => {
    visitSite('status');
    cy.get('header h1').should('readText', t('status.board.title', { vars: { app: appName } }));
    cy.title().should('eq', `${appName} Status`);
  });

  it('THEME-03 with the branding query blocked the bundled Duncit name and logo are used', () => {
    blockQuery('branding { app_name logo_url primary_color }');
    visitSite('status');
    cy.get('header img').should('have.attr', 'src', '/duncit-logo.svg').and('have.attr', 'alt', 'Duncit');
    cy.title().should('eq', 'Duncit Status');
  });

  it('LANG-01 with the translations query blocked the bundled English copy renders, with no raw keys', () => {
    blockQuery('publicTranslations');
    visitSite('status');
    cy.get('header h1').should('readText', statusFallbackT('status.board.title', { vars: { app: appName } }));
    cy.contains('button', statusFallbackT('status.report.open')).should('exist');
    cy.get('body').invoke('text').should('not.match', RAW_KEY);
  });
});
