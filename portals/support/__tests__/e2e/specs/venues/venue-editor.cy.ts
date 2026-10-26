import type { RunAccount } from '../../support/run-account';
import {
  countOperation,
  expectNotSent,
  expectRefused,
  restoreStaffRoles,
  revokeRoles,
  staffAccount,
} from '../../support/ui-staff';
import {
  GOVERNED_NOTE,
  ZERO_ID,
  consoleLogin,
  editorShows,
  expectGovernable,
  expectGovernedReadOnly,
  firstRows,
  grantConsoleRoles,
  rawAs,
  typeInto,
} from '../../support/ui-directories';

/**
 * Venues console › Venue editor (/venues/new, /venues/:venueId/edit).
 *
 * Nothing is saved. A venue the console creates cannot be removed again by any
 * role a run account may hold (deleteVenue is SUPER_ADMIN / DEVELOPERS_MANAGER),
 * and every existing venue is a real partner's. So the editor is driven up to
 * the validation that stops Save before a request leaves, on a blank form or on
 * a real venue's editor left unsaved, and the server's governance refusal is
 * proven on an id nobody has.
 *
 * The governor scenarios hold ONBOARDING_MANAGER (a venue governor) on
 * /venues/new only, and give it back in `after()`.
 */

const CREATE = 'VenueEditorCreate';
const UPDATE = 'VenueEditorUpdate';
const ROLES = ['ALL_VENUES_ACCESS'] as const;

const VENUES_API = `query E2eVenueIds($query: TableQueryInput) {
  venuesTable(query: $query) { rows { id venue_name } }
}`;

/** The console's own update, with a status — refused to a non-governor before any write. */
const UPDATE_WITH_STATUS = `mutation E2eVenueStatus(
  $id: ID!, $step1: VenueStep1Input!, $step2: VenueStep2Input!, $step3: VenueStep3Input!, $status: VenueStatus
) {
  adminUpdateVenue(venue_doc_id: $id, step1: $step1, step2: $step2, step3: $step3, status: $status) { id }
}`;

const PLACEHOLDER_STEPS = {
  step1: { venue_name: 'E2E refused', venue_type: 'Cafe', capacity: 1 },
  step2: { address_line1: 'E2E refused', city: 'E2E', state: 'E2E', postal_code: '000000' },
  step3: { documents: [], owner_name: 'E2E', owner_email: 'e2e@example.com', owner_phone: '0000000000' },
};

/** A real venue, to open its editor and leave it unsaved. */
const someVenue = () =>
  firstRows<{ id: string; venue_name: string }>(VENUES_API, 'venuesTable', 1).then((rows) => {
    expect(rows, 'staging lists at least one venue').to.have.length.greaterThan(0);
    return rows[0];
  });

function openNew(): void {
  cy.interceptOperation('VenueEditorRegistrationConfig');
  cy.visitPortal('venues', '/venues/new');
  cy.wait('@VenueEditorRegistrationConfig');
  cy.byTestId('back-header-title').should('have.text', 'New venue');
}

describe('Venues console · Venue editor (run account, password CHANGED)', () => {
  let account: RunAccount;
  let token = '';

  before(() => {
    account = staffAccount();
    grantConsoleRoles(account, ROLES);
  });

  beforeEach(() => {
    consoleLogin('venues', account).then((t) => {
      token = t;
    });
  });

  after(() => {
    if (account) {
      revokeRoles(account, ['ONBOARDING_MANAGER']);
      restoreStaffRoles(account, ROLES);
    }
  });

  it('VE-01 Save on a blank venue shows the field rules and sends nothing; a bad owner phone is named', () => {
    openNew();
    const creates = countOperation(CREATE);
    cy.byTestId('entity-editor-save').click();
    editorShows(['Pick the account that owns this venue', 'Venue name must be at least 2 characters']);
    cy.byTestId('venue-editor-name').find('input').should('have.attr', 'aria-invalid', 'true');

    typeInto('venue-editor-owner-phone', '12ab');
    cy.byTestId('entity-editor-save-bottom').click();
    cy.byTestId('venue-editor-owner-phone').should(
      'contain.text',
      'Owner phone must be 6 to 15 digits, with an optional + in front',
    );
    expectNotSent(creates, CREATE);
  });

  it('VE-02 Cancel and the back arrow leave without saving: to /venues from a new venue, to the record from an edit', () => {
    openNew();
    cy.byTestId('entity-editor-cancel').click();
    cy.location('pathname').should('eq', '/venues');

    someVenue().then((venue) => {
      const updates = countOperation(UPDATE);
      cy.visitPortal('venues', `/venues/${venue.id}/edit`);
      cy.byTestId('back-header-title').should('have.text', venue.venue_name);
      typeInto('venue-editor-name', 'E2E edit that is never saved');
      cy.byTestId('back-header-back').click();
      cy.location('pathname').should('eq', `/venues/${venue.id}`);

      cy.visitPortal('venues', `/venues/${venue.id}/edit`);
      cy.byTestId('entity-editor-cancel').click();
      cy.location('pathname').should('eq', `/venues/${venue.id}`);
      expectNotSent(updates, UPDATE);
    });
  });

  it('VE-03 capacity spaces are repeating rows that add and remove; with no holidays the list reads "No holidays added."', () => {
    openNew();
    cy.byTestId('venue-editor-no-holidays').should('have.text', 'No holidays added.');
    cy.byTestId('venue-editor-space-0-label').should('not.exist');
    cy.byTestId('venue-editor-add-space').click();
    cy.byTestId('venue-editor-add-space').click();
    typeInto('venue-editor-space-0-label', 'Rooftop');
    cy.byTestId('venue-editor-space-1-label').should('exist');
    cy.byTestId('venue-editor-space-1-remove').click();
    cy.byTestId('venue-editor-space-1-label').should('not.exist');
    cy.byTestId('venue-editor-space-0-label').find('input').should('have.value', 'Rooftop');
  });

  it('VE-04 a console-role editor sees status, money and Duncit’s cancellation half read-only, and the server refuses a status change', () => {
    someVenue().then((venue) => {
      cy.visitPortal('venues', `/venues/${venue.id}/edit`);
      expectGovernedReadOnly('venue-editor-share-pct', GOVERNED_NOTE);
      cy.byTestId('venue-editor-trigger-hours').find('input').should('be.disabled');
      cy.byTestId('venue-editor-add-refund-band').should('be.disabled');
      // The venue's own charge bands stay editable for the console role.
      cy.byTestId('venue-editor-add-charge-band').should('be.enabled');
    });
    rawAs('venues', UPDATE_WITH_STATUS, { id: ZERO_ID, ...PLACEHOLDER_STEPS, status: 'APPROVED' }, token).then((body) =>
      expectRefused(body, 'adminUpdateVenue', 'You cannot change a venue review status'),
    );
  });

  it('VE-05 the editor’s Food section offers dishes and QR ordering, and shows the owner’s Razorpay account as a status only', () => {
    openNew();
    cy.byTestId('venue-editor-food-ordering').should('not.exist');
    cy.byTestId('venue-editor-offers-food').find('input').check();
    cy.byTestId('venue-editor-food-add').should('be.visible');
    cy.byTestId('venue-editor-food-ordering').should('be.visible');
    cy.byTestId('venue-editor-food-account-status').should('be.visible');
    cy.byTestId('venue-editor-food-razorpay').should('not.exist');
  });

  it('VE-06 a governor (ONBOARDING_MANAGER) may move status and money, and a share, a refund or a percentage charge over 100 blocks Save', () => {
    grantConsoleRoles(account, ['ONBOARDING_MANAGER']);
    consoleLogin('venues', account);
    openNew();
    const creates = countOperation(CREATE);
    expectGovernable('venue-editor-share-pct');
    cy.byTestId('venue-editor-trigger-hours').find('input').should('be.enabled');

    typeInto('venue-editor-share-pct', '150');
    cy.byTestId('venue-editor-add-refund-band').click();
    typeInto('venue-editor-refund-0-pct', '150');
    cy.byTestId('venue-editor-add-charge-band').click();
    typeInto('venue-editor-charge-0-value', '150');
    cy.byTestId('entity-editor-save').click();

    cy.byTestId('venue-editor-share-pct').should('contain.text', 'Venue share % must be at most 100');
    cy.byTestId('venue-editor-refund-0-pct').should('contain.text', 'Refund % must be at most 100');
    cy.byTestId('venue-editor-charge-0-value').should('contain.text', 'A percentage charge cannot exceed 100');
    expectNotSent(creates, CREATE);
    cy.location('pathname').should('eq', '/venues/new');
  });
});
