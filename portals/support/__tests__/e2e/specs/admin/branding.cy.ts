// The colour maths only — the package index also loads React components the spec bundle must not pull in.
import { mix } from '../../../../../../packages/theme/src/contrast';
import { tokens } from '../../../../../../packages/theme/src/tokens';
import { ACCESS_DENIED } from '../../support/ui-staff';
import {
  cityAdminSeat,
  fieldInput,
  releaseAdminRoles,
  signInAdmin,
  type AdminSeat,
} from '../../support/ui-admin-2';

/**
 * Admin › System › Branding (/branding), as a City Admin. Branding is public
 * to read and written only by SUPER_ADMIN and TECH_MANAGER
 * (settings.resolver.ts ADMIN_WRITE) — and every app on staging renders it, so
 * nothing is saved here. The spec proves the page loads the live values, that
 * the identity colour fills both theme token tables in the form, that a bad
 * token is flagged before any save, and that a City Admin's "Save Branding" —
 * the page's own unchanged form — is refused.
 */

const BRANDING = `query E2eBrandingIdentity { branding { app_name primary_color } }`;

const NEW_PRIMARY = '#2e7d32';
/** What `primaryTokens` (branding-page/theme-tokens/tokenRows.ts) derives: 10% and 20% toward black. */
const HOVER = mix(NEW_PRIMARY, tokens.common.black, 0.1);
const ACTIVE = mix(NEW_PRIMARY, tokens.common.black, 0.2);

const section = (title: string) => cy.contains('[data-testid="branding-section"]', title);

/** The server-value input of one token row, in the light (0) or dark (1) table. */
const tokenInput = (table: 0 | 1, token: string) =>
  cy
    .byTestId('branding-token-table')
    .eq(table)
    .find(`[data-testid="branding-token-row-${token}"]`)
    .find('input:not([type="color"])');

function openBranding(): void {
  cy.interceptOperation('Branding');
  cy.visitPortal('admin', '/branding');
  cy.wait('@Branding');
}

describe('Admin · Branding (City Admin, run account)', () => {
  let seat: AdminSeat;

  before(() => {
    cityAdminSeat().then((s) => {
      seat = s;
    });
  });

  beforeEach(() => {
    if (seat) signInAdmin(seat.account);
  });

  after(() => {
    releaseAdminRoles(seat?.account);
  });

  it('BRD-01 the page loads the live identity, and "Save Branding" is refused to a City Admin', () => {
    cy.gql<{ branding: { app_name: string; primary_color: string } }>(BRANDING).then(({ branding }) => {
      openBranding();
      fieldInput('branding-app-name').should('have.value', branding.app_name ?? '');
      cy.interceptOperation('UpdateBranding');
      cy.byTestId('branding-save').click();
      cy.wait('@UpdateBranding').its('response.body.errors.0.message').should('eq', ACCESS_DENIED);
      cy.byTestId('branding-error').should('have.text', ACCESS_DENIED);
      cy.gql(BRANDING).its('branding').should('deep.eq', branding);
    });
  });

  it('BRD-02 the identity primary colour fills the primary steps of the Light and Dark token tables', () => {
    openBranding();
    section('Theme tokens (mWeb + app)').click();
    cy.byTestId('branding-primary-color').find('input:not([type="color"])').first().clear().type(NEW_PRIMARY, {
      delay: 0,
    });
    for (const table of [0, 1] as const) {
      tokenInput(table, 'primary').should('have.value', NEW_PRIMARY);
      tokenInput(table, 'primaryHover').should('have.value', HOVER);
      tokenInput(table, 'primaryActive').should('have.value', ACTIVE);
      tokenInput(table, 'onPrimary').invoke('val').should('not.be.empty');
    }
  });

  it('BRD-03 a token value that is not a colour is flagged before anything is saved', () => {
    openBranding();
    section('Theme tokens (mWeb + app)').click();
    tokenInput(0, 'primary').clear().type('not-a-colour', { delay: 0 });
    cy.byTestId('branding-token-table')
      .eq(0)
      .find('[data-testid="branding-token-row-primary"]')
      .should('contain.text', 'Use #hex, rgb() or rgba()');
  });
});
