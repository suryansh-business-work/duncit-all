import {
  copyOf,
  countOperation,
  expectNotSent,
  findPartnerWorld,
  foreignVenueId,
  gridRow,
  loadCopy,
  marked,
  signInPartner,
  type PartnerWorld,
} from '../../support/partner-world-1';

/**
 * Partners · Venue registration (/register-venue, /register-venue/new|current|:venueId)
 * on the run's OWN two venues: the approved one and the draft the fixture step
 * started and never submitted (neither has a cover image or a category — the
 * fixture registers them through the API).
 *
 * Every scenario here stops at the form's own refusal: nothing is saved, so no
 * venue changes and nothing needs restoring. That is proved by counting the
 * save operations (V1 / VFinal / UpdateApprovedVenue) the page sent.
 *
 * Not here: the full register-and-submit path and document appends (they upload
 * to ImageKit, which the run's purge does not cover outside /pods), a SUBMITTED
 * or REJECTED application (the account can hold only one open draft, and the
 * draft is shared with the other Partners specs), and leave dates (a MUI X
 * sectioned date field).
 */

const CONFIG_QUERY = `query E2eUiVenueConfig { venueRegistrationConfig { capacity_item_limit } }`;
const VENUE_QUERY = `query E2eUiVenueForm($id: ID) {
  myVenue(venue_id: $id) { id cover_image_url capacity_items { label } }
}`;

interface VenueForm {
  id: string;
  cover_image_url: string | null;
  capacity_items: Array<{ label: string }>;
}

/** Open a registration page and wait until the venue behind it has loaded. */
function openForm(path: string): void {
  cy.interceptOperation('MyVenue');
  cy.visitApp(path);
  cy.wait('@MyVenue');
}

describe('Partners UI · Venue registration', () => {
  let world: PartnerWorld;
  let capacityLimit = 0;
  let approvedForm: VenueForm;

  before(() => {
    signInPartner();
    loadCopy();
    findPartnerWorld().then((found) => {
      world = found;
      cy.gql<{ myVenue: VenueForm }>(VENUE_QUERY, { id: found.draftVenue.id }).then(({ myVenue }) => {
        // The refusals below rely on the draft's Venue Details being incomplete.
        expect(myVenue.cover_image_url ?? '', 'the draft venue has no cover image yet').to.equal('');
      });
      cy.gql<{ myVenue: VenueForm }>(VENUE_QUERY, { id: found.venue.id }).then(({ myVenue }) => {
        approvedForm = myVenue;
      });
    });
    cy.gql<{ venueRegistrationConfig: { capacity_item_limit: number } }>(CONFIG_QUERY).then((data) => {
      capacityLimit = data.venueRegistrationConfig.capacity_item_limit;
    });
  });

  beforeEach(() => {
    signInPartner();
  });

  it('VR-01 the registrations table lists only the account’s own venues', () => {
    cy.interceptOperation('MyVenuesTable');
    cy.visitApp('/register-venue');
    cy.wait('@MyVenuesTable').then(({ response }) => {
      const rows: Array<{ id: string }> = response?.body?.data?.myVenuesTable?.rows ?? [];
      const own = world.venues.map((venue) => venue.id);
      expect(rows.map((row) => row.id), 'rows on the first page').to.include.members([world.venue.id, world.draftVenue.id]);
      rows.forEach((row) => expect(own, `row ${row.id} is one of myVenues`).to.include(row.id));
      foreignVenueId(world).then((foreign) => {
        expect(rows.map((row) => row.id), 'another partner’s venue').not.to.include(foreign);
      });
    });
    gridRow(world.venue.id).should('contain.text', world.venue.name);
    gridRow(world.draftVenue.id).should('contain.text', world.draftVenue.name);
  });

  it('VR-02 row actions follow the status: the approved venue offers Availability and View, the draft Edit', () => {
    cy.interceptOperation('MyVenuesTable');
    cy.visitApp('/register-venue');
    cy.wait('@MyVenuesTable');
    gridRow(world.venue.id).find(`a[href="/venues/${world.venue.id}/availability"]`).should('contain.text', 'Availability');
    gridRow(world.venue.id).find(`a[href="/register-venue/${world.venue.id}"]`).should('contain.text', 'View');
    gridRow(world.draftVenue.id).find(`a[href="/venues/${world.draftVenue.id}/availability"]`).should('not.exist');
    cy.interceptOperation('MyVenue');
    gridRow(world.draftVenue.id).find(`a[href="/register-venue/${world.draftVenue.id}"]`).should('contain.text', 'Edit').click();
    cy.wait('@MyVenue');
    cy.location('pathname').should('eq', `/register-venue/${world.draftVenue.id}`);
    cy.byTestId('register-venue-title').should('have.text', world.draftVenue.name);
    cy.byTestId('register-venue-status').should('have.text', 'DRAFT');
  });

  it('VR-03 the search box asks the server for matching registrations and shows only the draft', () => {
    const term = marked('draft venue');
    cy.interceptOperation('MyVenuesTable');
    cy.visitApp('/register-venue');
    cy.wait('@MyVenuesTable');
    cy.byTestId('table-toolbar-search').type(term, { delay: 0 });
    cy.wait('@MyVenuesTable').then(({ request, response }) => {
      expect(request.body.variables.query.search, 'search sent').to.equal(term);
      const ids = (response?.body?.data?.myVenuesTable?.rows ?? []).map((row: { id: string }) => row.id);
      expect(ids, 'matching rows').to.deep.equal([world.draftVenue.id]);
    });
    gridRow(world.draftVenue.id).should('be.visible');
    gridRow(world.venue.id).should('not.exist');
  });

  it('VR-04 a search nothing matches shows No venue registration yet.', () => {
    cy.interceptOperation('MyVenuesTable');
    cy.visitApp('/register-venue');
    cy.wait('@MyVenuesTable');
    cy.byTestId('table-toolbar-search').type(marked('no such venue'), { delay: 0 });
    cy.wait('@MyVenuesTable').its('response.body.data.myVenuesTable.total').should('eq', 0);
    cy.byTestId('duncit-table-grid').should(
      'contain.text',
      copyOf('partners.venueListingsPage.noVenueRegistrationYet', 'No venue registration yet.'),
    );
  });

  it('VR-05 Register Venue opens /register-venue/new, which resumes the open draft; the back link returns', () => {
    cy.visitApp('/register-venue');
    cy.interceptOperation('MyVenue');
    cy.byTestId('register-venue-start').should('contain.text', 'Register Venue').click();
    cy.wait('@MyVenue');
    cy.location('pathname').should('eq', '/register-venue/new');
    // No second venue: the open DRAFT is hydrated instead of a blank form.
    cy.byTestId('register-venue-title').should('have.text', world.draftVenue.name);
    cy.byTestId('register-venue-status').should('have.text', 'DRAFT');
    cy.byTestId('back-button').click();
    cy.location('pathname').should('eq', '/register-venue');
  });

  it('VR-06 /register-venue/current hydrates the open draft before the approved venue', () => {
    openForm('/register-venue/current');
    cy.byTestId('register-venue-title').should('have.text', world.draftVenue.name);
    cy.byTestId('register-venue-status').should('have.text', 'DRAFT');
  });

  it('VR-07 the approved venue opens in approved-edit mode without Review & Submit', () => {
    openForm(`/register-venue/${world.venue.id}`);
    cy.byTestId('register-venue-title').should('have.text', world.venue.name);
    cy.byTestId('register-venue-status').should('have.text', 'APPROVED');
    cy.byTestId('register-venue-approved-alert').should('be.visible');
    cy.byTestId('register-venue-section-review').should('not.exist');
    cy.byTestId('register-venue-save-approved').should('contain.text', 'Save changes');
  });

  it('VR-08 Save & continue on an incomplete Venue Details shows its errors and saves nothing', () => {
    const step1 = countOperation('V1');
    openForm('/register-venue/new?selectedtab=details');
    cy.byTestId('register-venue-name').find('input').should('have.value', world.draftVenue.name).clear();
    cy.byTestId('register-venue-save').should('contain.text', 'Save & continue').click();
    cy.byTestId('register-venue-name').should('contain.text', 'Venue name must be at least 2 characters');
    cy.byTestId('register-venue-cover-error').should('have.text', 'Upload a cover image');
    cy.location('search').should('contain', 'selectedtab=details');
    expectNotSent(step1, 'V1');
  });

  it('VR-09 saving Type & Capacity first steers back to Venue Details with Complete the Venue Details section first.', () => {
    const step1 = countOperation('V1');
    openForm('/register-venue/new?selectedtab=type-capacity');
    cy.byTestId('capacity-add').should('be.visible');
    cy.byTestId('register-venue-save').click();
    cy.byTestId('register-venue-error').should('have.text', 'Complete the Venue Details section first.');
    cy.location('search').should('contain', 'selectedtab=details');
    cy.byTestId('register-venue-section-details').should('have.attr', 'aria-current', 'true');
    expectNotSent(step1, 'V1');
  });

  it('VR-10 Submit for review with incomplete sections jumps to the first failing one and submits nothing', () => {
    const final = countOperation('VFinal');
    const step1 = countOperation('V1');
    openForm('/register-venue/new?selectedtab=review');
    cy.byTestId('register-venue-submit').should('contain.text', 'Submit for review').click();
    cy.byTestId('register-venue-error').should('have.text', 'Fix the highlighted fields before submitting.');
    cy.location('search').should('contain', 'selectedtab=details');
    cy.byTestId('register-venue-cover-error').should('have.text', 'Upload a cover image');
    expectNotSent(final, 'VFinal');
    expectNotSent(step1, 'V1');
  });

  it('VR-11 a capacity entry needs a label and a whole number from 1 to 100000', () => {
    const step1 = countOperation('V1');
    openForm('/register-venue/new?selectedtab=type-capacity');
    cy.byTestId('capacity-item-0-label').find('input').should('have.value', marked('venue space')).clear().blur();
    cy.byTestId('capacity-item-0-label').should('contain.text', 'Give this capacity a label (e.g. Banquet hall)');
    const capacity = () => cy.byTestId('capacity-item-0-capacity');
    capacity().find('input').clear().type('0').blur();
    capacity().should('contain.text', 'Capacity must be at least 1');
    capacity().find('input').clear().type('1.5');
    capacity().should('contain.text', 'Capacity must be a whole number');
    capacity().find('input').clear().type('100001');
    capacity().should('contain.text', 'Capacity is unrealistic');
    capacity().find('input').clear().type('120');
    capacity().should('contain.text', 'People it holds');
    cy.byTestId('capacity-item-0-label').find('input').type(marked('hall'));
    cy.byTestId('capacity-item-0-label').should('contain.text', 'e.g. Banquet hall, Rooftop tables');
    cy.contains('.MuiChip-label', 'Total: 120').should('be.visible');
    expectNotSent(step1, 'V1');
  });

  it('VR-12 the capacity list stops at the configured limit and reopens when an entry is removed', () => {
    openForm('/register-venue/new?selectedtab=type-capacity');
    cy.byTestId('capacity-item-0-label').find('input').should('have.value', marked('venue space'));
    cy.get('[data-testid$="-remove"][data-testid^="capacity-item-"]').then(($rows) => {
      const toAdd = capacityLimit - $rows.length;
      expect(toAdd, 'entries the limit still allows').to.be.greaterThan(0);
      Cypress._.times(toAdd, () => cy.byTestId('capacity-add').click());
    });
    cy.byTestId('capacity-add').should('be.disabled');
    cy.byTestId('capacity-limit').should('have.text', `At most ${capacityLimit} capacity entries are allowed.`);
    cy.byTestId(`capacity-item-${capacityLimit - 1}-remove`).click();
    cy.byTestId('capacity-limit').should('not.exist');
    cy.byTestId('capacity-add').should('be.enabled');
  });

  it('VR-13 sections are URL-backed tabs, and a phone shows them as a scrollable strip instead of the rail', () => {
    openForm(`/register-venue/${world.draftVenue.id}`);
    cy.byTestId('register-venue-section-owner').click();
    cy.location('search').should('contain', 'selectedtab=owner');
    cy.byTestId('register-venue-owner-email').should('be.visible');
    cy.reload();
    cy.byTestId('register-venue-section-owner').should('have.attr', 'aria-current', 'true');
    cy.byTestId('register-venue-owner-email').should('be.visible');
    cy.viewport(390, 844);
    cy.byTestId('register-venue-section-rail').should('not.be.visible');
    cy.byTestId('register-venue-section-tabs').should('be.visible');
    cy.byTestId('register-venue-section-tab-owner').should('have.attr', 'aria-selected', 'true');
    cy.byTestId('register-venue-section-tab-type-capacity').click();
    cy.location('search').should('contain', 'selectedtab=type-capacity');
    cy.byTestId('capacity-add').should('be.visible');
  });

  it('VR-14 another partner’s venue id shows the not-found alert instead of the form', () => {
    foreignVenueId(world).then((foreign) => {
      openForm(`/register-venue/${foreign}`);
    });
    cy.byTestId('register-venue-not-found').should(
      'have.text',
      copyOf('partners.page.thisVenueRegistrationWasNotFound', 'This venue registration was not found in your account.'),
    );
    cy.byTestId('register-venue-section-rail').should('not.exist');
    cy.byTestId('back-button').click();
    cy.location('pathname').should('eq', '/register-venue');
  });

  it('VR-15 approved: identity fields are locked, and an emptied description is refused before any update', () => {
    const update = countOperation('UpdateApprovedVenue');
    openForm(`/register-venue/${world.venue.id}?selectedtab=details`);
    cy.byTestId('register-venue-name').find('input').should('be.disabled').and('have.value', world.venue.name);
    cy.byTestId('register-venue-description').find('textarea:not([aria-hidden])').should('not.have.value', '').clear();
    cy.byTestId('register-venue-save-approved').click();
    cy.byTestId('register-venue-description').should('contain.text', 'Venue description is required');
    cy.byTestId('register-venue-saved').should('not.exist');
    expectNotSent(update, 'UpdateApprovedVenue');
  });

  it('VR-16 approved: the venue type is locked, and an emptied capacity list is refused before any update', () => {
    const update = countOperation('UpdateApprovedVenue');
    openForm(`/register-venue/${world.venue.id}?selectedtab=type-capacity`);
    cy.byTestId('register-venue-type').find('[role="combobox"]').should('have.attr', 'aria-disabled', 'true');
    cy.byTestId('capacity-item-0-label').find('input').should('have.value', approvedForm.capacity_items[0]?.label);
    expect(approvedForm.capacity_items.length, 'capacity entries on the approved venue').to.be.greaterThan(0);
    Cypress._.times(approvedForm.capacity_items.length, () => cy.byTestId('capacity-item-0-remove').click());
    cy.byTestId('capacity-item-0-label').should('not.exist');
    cy.byTestId('register-venue-save-approved').click();
    cy.byTestId('capacity-list-error').should('have.text', 'Add at least one capacity entry for your venue');
    expectNotSent(update, 'UpdateApprovedVenue');
  });

  it('VR-17 approved: the owner email stays locked, and a malformed phone is refused before any update', () => {
    const update = countOperation('UpdateApprovedVenue');
    openForm(`/register-venue/${world.venue.id}?selectedtab=owner`);
    cy.byTestId('register-venue-owner-email').find('input').should('be.disabled').and('not.have.value', '');
    cy.byTestId('register-venue-owner-phone').find('input').should('not.have.value', '').clear().type('call-me');
    cy.byTestId('register-venue-save-approved').click();
    cy.byTestId('register-venue-owner-phone').should(
      'contain.text',
      'Owner phone must contain only digits (6–15 digits) with optional + prefix',
    );
    expectNotSent(update, 'UpdateApprovedVenue');
  });

  it('VR-18 approved: amenities, facilities and security are locked and offer no save', () => {
    openForm(`/register-venue/${world.venue.id}?selectedtab=amenities`);
    cy.byTestId('register-venue-amenities-locked').should('be.visible');
    ['amenities', 'facilities', 'security'].forEach((group) => {
      cy.byTestId(`register-venue-${group}`).then(($group) => {
        const chips = $group.find('.MuiChip-root');
        expect(chips.filter('.Mui-disabled').length, `${group} chips disabled`).to.equal(chips.length);
      });
    });
    cy.byTestId('register-venue-save-approved').should('not.exist');
  });
});
