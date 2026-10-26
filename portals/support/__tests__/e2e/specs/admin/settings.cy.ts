import { ACCESS_DENIED, countOperation, expectNotSent } from '../../support/ui-staff';
import {
  cityAdminSeat,
  releaseAdminRoles,
  signInAdmin,
  typeInto,
  type AdminSeat,
} from '../../support/ui-admin-2';

/**
 * Admin › System › Settings (/settings), as a City Admin. The appearance switch
 * is this browser's own; the display formats are platform-wide and written
 * only by SUPER_ADMIN and TECH_MANAGER (settings.resolver.ts ADMIN_WRITE), so
 * the spec proves the pattern checks that run before a save and that a City
 * Admin's save is refused. The time source, the minimum age and the account
 * deletion window are SUPER_ADMIN / TECH_MANAGER settings and are not touched.
 */

const FORMATS = `query E2eAppSettingsFormats { appSettings { date_format time_format } }`;
const COLOR_MODE_KEY = 'admin_color_mode';

function openSettings(): void {
  cy.interceptOperation('AppSettingsFormats');
  cy.visitPortal('admin', '/settings');
  cy.wait('@AppSettingsFormats');
}

describe('Admin · Settings (City Admin, run account)', () => {
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

  it('SET-01 the appearance switch flips this browser between light and dark and keeps the choice', () => {
    openSettings();
    cy.byTestId('settings-appearance-switch').then(($input) => {
      const wasDark = $input.is(':checked');
      const next = wasDark ? 'Light mode' : 'Dark mode';
      cy.byTestId('settings-appearance-switch').click();
      cy.byTestId('settings-appearance').should('contain.text', next);
      cy.window().its('localStorage').invoke('getItem', COLOR_MODE_KEY).should('eq', wasDark ? 'light' : 'dark');
      cy.reload();
      cy.byTestId('settings-appearance').should('contain.text', next);
      cy.byTestId('settings-appearance-switch').should(wasDark ? 'not.be.checked' : 'be.checked');
    });
  });

  it('SET-02 a pattern the pickers cannot edit is named and blocks Save; a broken one previews as invalid', () => {
    openSettings();
    const saves = countOperation('UpdateAppSettingsFormats');
    typeInto('settings-date-pattern', 'PPP');
    cy.byTestId('settings-format-unusable').should('contain.text', 'PPP');
    cy.byTestId('settings-formats-save').should('be.disabled');
    typeInto('settings-date-pattern', 'dd j');
    cy.byTestId('settings-format-preview').should('have.text', 'Preview: Invalid format pattern');
    cy.byTestId('settings-formats-save').should('be.disabled');
    expectNotSent(saves, 'UpdateAppSettingsFormats');
  });

  it('SET-03 saving another date format is refused to a City Admin, and the stored formats stay', () => {
    cy.gql<{ appSettings: { date_format: string; time_format: string } }>(FORMATS).then(({ appSettings }) => {
      const other = appSettings.date_format === 'dd MMM yyyy' ? 'yyyy-MM-dd' : 'dd MMM yyyy';
      openSettings();
      cy.byTestId('settings-date-preset').find('[role="combobox"]').click();
      cy.byTestId(`settings-date-preset-${other}`).click();
      cy.interceptOperation('UpdateAppSettingsFormats');
      cy.byTestId('settings-formats-save').should('be.enabled').click();
      cy.wait('@UpdateAppSettingsFormats').its('response.body.errors.0.message').should('eq', ACCESS_DENIED);
      cy.byTestId('settings-formats-error').should('have.text', ACCESS_DENIED);
      cy.gql(FORMATS).its('appSettings').should('deep.eq', appSettings);
    });
  });
});
