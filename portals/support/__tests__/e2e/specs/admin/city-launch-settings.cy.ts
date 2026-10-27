import { DEFAULT_LAUNCH_TARGET } from '@duncit/utils';
import { openTable, searchTable, tableRow } from '../../support/tables';
import { specMarker, wideViewport } from '../../support/ui-staff';
import {
  brandingImage,
  cityAdminSeat,
  deleteMarkedLocations,
  expectToast,
  fieldInput,
  fillLocationDialog,
  locationNamed,
  releaseAdminRoles,
  signInAdmin,
  typeInto,
  type AdminSeat,
} from '../../support/ui-admin-2';

/**
 * Admin › Locations › Launch Settings: whether a city is live, and what its
 * launch waitlist page shows until it is — as a City Admin (location
 * ADMIN_WRITE = SUPER_ADMIN, CITY_ADMIN).
 *
 * One city of the spec's own (marker-named, removed in `after()`) is added,
 * given its own launch page backdrop, cleared back to the global one, and
 * launched. The global launch page media are written to Branding, which a City
 * Admin cannot save, so they are not touched.
 */

const TABLE = 'admin-locations';
const TARGET_INVALID = 'Enter a whole number from 1 to 1,000,000.';
const GROUP_INVALID = 'Enter a WhatsApp group invite link starting with https://chat.whatsapp.com/';

function editCity(id: string, marker: string): void {
  wideViewport();
  openTable('admin', '/locations', 'LocationsTable');
  searchTable('LocationsTable', marker);
  cy.byTestId(`${TABLE}-row-${id}`).find('[data-testid="row-action-edit"]').click();
  cy.byTestId('location-form-dialog').should('be.visible');
}

describe('Admin · City Launch Settings (City Admin, run account)', () => {
  let seat: AdminSeat;
  let marker: string;
  let city: string;
  let image: string;

  before(() => {
    cityAdminSeat().then((s) => {
      seat = s;
      marker = specMarker(s.account, 'admin-launch');
      city = `${marker} Town`;
    });
    brandingImage().then((url) => {
      image = url;
    });
  });

  beforeEach(() => {
    if (seat) signInAdmin(seat.account);
  });

  after(() => {
    if (!seat) return;
    signInAdmin(seat.account);
    deleteMarkedLocations(marker);
    releaseAdminRoles(seat.account);
  });

  it('CLS-01 a new city starts as a waitlist: Not launched, with the default launch target', () => {
    wideViewport();
    openTable('admin', '/locations', 'LocationsTable');
    cy.byTestId('locations-new').click();
    cy.byTestId('location-form-launched').should('not.be.checked');
    fieldInput('location-form-launch-target').should('have.value', String(DEFAULT_LAUNCH_TARGET));
    fillLocationDialog(city, image, [['E2E Area', '560001']]);
    cy.byTestId('location-form-save').click();
    expectToast('locations-toast', 'Saved');
    locationNamed(city).then((loc) => {
      expect(loc.is_launched).to.eq(false);
      expect(loc.launch_target).to.eq(DEFAULT_LAUNCH_TARGET);
      searchTable('LocationsTable', marker);
      tableRow(TABLE, loc.id, [city, 'Not launched']);
    });
  });

  it('CLS-02 a bad launch target or group link keeps Save off; an empty link is allowed', () => {
    locationNamed(city).then((loc) => editCity(loc.id, marker));
    typeInto('location-form-launch-target', '0');
    cy.byTestId('location-form-launch-settings').should('contain.text', TARGET_INVALID);
    cy.byTestId('location-form-save').should('be.disabled');
    typeInto('location-form-launch-target', '25');
    cy.byTestId('location-form-launch-settings').should('not.contain.text', TARGET_INVALID);
    typeInto('location-form-whatsapp-group-url', 'https://example.com/group');
    cy.byTestId('location-form-launch-settings').should('contain.text', GROUP_INVALID);
    cy.byTestId('location-form-save').should('be.disabled');
    fieldInput('location-form-whatsapp-group-url').clear();
    cy.byTestId('location-form-launch-settings').should('not.contain.text', GROUP_INVALID);
    cy.byTestId('location-form-save').should('be.enabled').click();
    expectToast('locations-toast', 'Saved');
    locationNamed(city).then((loc) => {
      expect(loc.launch_target).to.eq(25);
      expect(loc.whatsapp_group_url).to.eq('');
    });
  });

  it('CLS-03 a city backdrop overrides the global one, and clearing it plays the global media again', () => {
    locationNamed(city).then((loc) => editCity(loc.id, marker));
    cy.byTestId('location-form-launch-media').find('[aria-expanded]').first().click();
    cy.byTestId('location-form-launch-media-hero').find('input').eq(1).type(image, { delay: 0 });
    cy.byTestId('location-form-save').click();
    expectToast('locations-toast', 'Saved');
    locationNamed(city).its('launch_media.hero_image_url').should('eq', image);

    // Reopened, the section is open because the city overrides it.
    locationNamed(city).then((loc) => editCity(loc.id, marker));
    cy.byTestId('location-form-launch-media-hero').find('input').eq(1).should('have.value', image).clear();
    cy.byTestId('location-form-save').click();
    expectToast('locations-toast', 'Saved');
    locationNamed(city).its('launch_media.hero_image_url').should('eq', '');
  });

  it('CLS-04 switching Launched on makes the city live', () => {
    locationNamed(city).then((loc) => {
      editCity(loc.id, marker);
      cy.byTestId('location-form-launched').check();
      cy.byTestId('location-form-save').click();
      expectToast('locations-toast', 'Saved');
      tableRow(TABLE, loc.id, ['Launched']);
    });
    locationNamed(city).its('is_launched').should('eq', true);
  });
});
