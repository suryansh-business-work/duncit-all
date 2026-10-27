import { openTable, searchTable, tableRow } from '../../support/tables';
import {
  ACCESS_DENIED,
  countOperation,
  expectConfirm,
  expectNotSent,
  expectTableEmpty,
  revokeRoles,
  specMarker,
  wideViewport,
} from '../../support/ui-staff';
import {
  adminRaw,
  brandingImage,
  cityAdminSeat,
  deleteMarkedLocations,
  expectError,
  expectToast,
  fieldInput,
  fillLocationDialog,
  grantCityAdmin,
  locationNamed,
  markedLocations,
  releaseAdminRoles,
  signInAdmin,
  swapAdminRole,
  type AdminSeat,
} from '../../support/ui-admin-2';

/**
 * Admin › Locations (/locations), as a City Admin (location.resolver.ts
 * ADMIN_WRITE = SUPER_ADMIN, CITY_ADMIN).
 *
 * The spec adds one city of its own — named with the run's marker, so it is
 * the only row a search for the marker finds — edits it, deactivates it and
 * deletes it. Shared cities are only read. The AI fill is not called (its
 * answer is a model's, not deterministic); only the check that runs before it
 * is.
 */

const TABLE = 'admin-locations';
const EMPTY = 'No locations yet. Click "New Location" to create one.';
const ZERO_ID = '000000000000000000000000';
const DELETE_LOCATION = `mutation E2eDeleteLocation($id: ID!) { deleteLocation(location_doc_id: $id) }`;

function openLocations(): void {
  wideViewport();
  openTable('admin', '/locations', 'LocationsTable');
}

describe('Admin · Locations (City Admin, run account)', () => {
  let seat: AdminSeat;
  let marker: string;
  let city: string;
  let image: string;

  before(() => {
    cityAdminSeat().then((s) => {
      seat = s;
      marker = specMarker(s.account, 'admin-loc');
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

  it('LOC-01 the table loads, and a search nothing matches shows the empty line', () => {
    openLocations();
    cy.byTestId('duncit-table-grid').should('be.visible');
    searchTable('LocationsTable', `${marker} nowhere`);
    expectTableEmpty(EMPTY);
  });

  it('LOC-02 the checks run on Save: areas, their PIN codes and the image are each required', () => {
    openLocations();
    const creates = countOperation('CreateLocation');
    cy.byTestId('locations-new').click();
    cy.byTestId('location-form-save').should('be.disabled');
    fieldInput('location-form-state').type('Karnataka', { delay: 0 }).type('{downArrow}{enter}');
    fieldInput('location-form-city').type(city, { delay: 0 });
    cy.byTestId('location-form-save').click();
    cy.byTestId('location-form-error').should('have.text', 'At least one locality / area is required');
    cy.byTestId('location-form-zone-name').first().find('input').type('E2E Area One', { delay: 0 });
    cy.byTestId('location-form-save').click();
    cy.byTestId('location-form-error').should('have.text', 'PIN code is required for every locality / area');
    cy.byTestId('location-form-zone-pin').first().find('input').type('560001', { delay: 0 });
    cy.byTestId('location-form-save').click();
    cy.byTestId('location-form-error').should('have.text', 'Location image URL is required');
    expectNotSent(creates, 'CreateLocation');
  });

  it('LOC-03 changing the country clears the state, the city and the location name', () => {
    openLocations();
    cy.byTestId('locations-new').click();
    fieldInput('location-form-state').type('Karnataka', { delay: 0 }).type('{downArrow}{enter}');
    fieldInput('location-form-city').type(city, { delay: 0 });
    fieldInput('location-form-country').clear().type('Nepal', { delay: 0 }).type('{enter}');
    fieldInput('location-form-country').should('contain.value', 'Nepal');
    fieldInput('location-form-state').should('have.value', '');
    fieldInput('location-form-city').should('have.value', '');
    cy.byTestId('location-form-save').should('be.disabled');
  });

  it('LOC-04 AI fill asks for country, state and city before it calls the model', () => {
    openLocations();
    const fills = countOperation('AiFillLocationAreas');
    cy.byTestId('locations-new').click();
    cy.byTestId('location-form-ai-fill').click();
    cy.byTestId('location-form-ai-error').should('have.text', 'Select country, state and city before using AI fill.');
    expectNotSent(fills, 'AiFillLocationAreas');
  });

  it('LOC-05 creates a location: both localities listed, the first area PIN as the primary PIN', () => {
    openLocations();
    cy.byTestId('locations-new').click();
    fillLocationDialog(city, image, [
      ['E2E Area One', '560001'],
      ['E2E Area Two', '560002'],
    ]);
    cy.interceptOperation('CreateLocation');
    cy.byTestId('location-form-save').click();
    cy.wait('@CreateLocation').its('response.body.errors').should('be.undefined');
    expectToast('locations-toast', 'Saved');
    locationNamed(city).then((loc) => {
      expect(loc.location_pincode).to.eq('560001');
      expect(loc.location_zones.map((z) => z.zone_name)).to.deep.eq(['E2E Area One', 'E2E Area Two']);
      expect(loc.is_active).to.eq(true);
      searchTable('LocationsTable', marker);
      tableRow(TABLE, loc.id, [city, 'E2E Area One · 560001', 'E2E Area Two · 560002']);
    });
  });

  it('LOC-06 the Active switch is offered only when editing; switching it off marks the row inactive', () => {
    openLocations();
    cy.byTestId('locations-new').click();
    cy.byTestId('location-form-active').should('not.exist');
    cy.get('body').type('{esc}');
    locationNamed(city).then((loc) => {
      searchTable('LocationsTable', marker);
      cy.byTestId(`${TABLE}-row-${loc.id}`).find('[data-testid="row-action-edit"]').click();
      cy.byTestId('location-form-active').should('be.checked').uncheck();
      cy.byTestId('location-form-save').click();
      expectToast('locations-toast', 'Saved');
      tableRow(TABLE, loc.id, ['Inactive']);
    });
    locationNamed(city).its('is_active').should('eq', false);
  });

  it('LOC-07 deletes the location after a destructive confirmation', () => {
    openLocations();
    locationNamed(city).then((loc) => {
      searchTable('LocationsTable', marker);
      cy.byTestId(`${TABLE}-row-${loc.id}`).find('[data-testid="row-action-delete"]').click();
      expectConfirm('Delete location');
      cy.byTestId('confirm-dialog-message').should('contain.text', city);
      cy.byTestId('confirm-dialog-confirm').click();
      expectToast('locations-toast', 'Deleted');
      cy.byTestId(`${TABLE}-row-${loc.id}`).should('not.exist');
    });
    markedLocations(city).should('have.length', 0);
  });

  it('LOC-08 a Zonal Admin opens the console but is refused a location delete', () => {
    swapAdminRole(seat.account, 'CITY_ADMIN', 'ZONAL_ADMIN');
    adminRaw(DELETE_LOCATION, { id: ZERO_ID }).then((body) => expectError(body, ACCESS_DENIED));
    // Back to City Admin, so after() can remove what a failed scenario left.
    revokeRoles(seat.account, ['ZONAL_ADMIN']);
    grantCityAdmin(seat.account, seat.city);
  });
});
