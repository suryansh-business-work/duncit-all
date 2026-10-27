import {
  copyOf,
  countOperation,
  expectNotSent,
  findPartnerWorld,
  foreignVenueId,
  loadCopy,
  marked,
  signInPartner,
  type PartnerWorld,
} from '../../support/partner-world-1';

/**
 * Partners · Venue availability (/venues/:venueId/availability): the page's
 * own guards (not mine / not approved) and the shared @duncit/availability-
 * calendar editor on the run's APPROVED venue.
 *
 * The one slot this spec publishes (a whole-day slot, day 33) is deleted in the
 * scenario that made it and again in after() if a step failed first; the one
 * leave day it sets (day 35) is put back to the venue's original holidays in
 * after(). The free pod's booked slot is only looked at.
 *
 * Not here: timed slots, multi-day and per-space slots, conflicts and
 * overwrites, the recurring generator, templates, rules, auto-extend and bulk
 * actions — they drive MUI X sectioned date/time fields or touch every
 * upcoming slot of the venue, including the ones the other specs rely on.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_DAYS = 60;
const WHOLE_DAY_OFFSET = 33;
const LEAVE_DAY_OFFSET = 35;

const VENUE_SETTINGS = `query E2eUiVenueHolidays($id: ID) { myVenue(venue_id: $id) { id settings { holidays } } }`;
const SET_HOLIDAYS = `mutation E2eUiSetHolidays($id: ID!, $input: VenueSettingsInput!) {
  updateVenueSettings(venue_doc_id: $id, input: $input) { id settings { holidays } }
}`;
const SLOTS = `query E2eUiVenueSlots($venue: ID!) { venueSlots(venue_id: $venue) { id start_at notes } }`;
const CREATE_SLOT = `mutation E2eUiLeaveDaySlot($input: BulkCreateVenueSlotsInput!) { createVenueSlots(input: $input) { id } }`;
const DELETE_SLOT = `mutation E2eUiDeleteWholeDaySlot($id: ID!) { deleteVenueSlot(slot_id: $id) }`;

const pad = (n: number) => String(n).padStart(2, '0');
/** The calendar's day key — date-fns `yyyy-MM-dd` in the browser's zone. */
const ymd = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
/** The toolbar's month label — date-fns `MMMM yyyy`. */
const monthLabel = (date: Date) => `${date.toLocaleString('en-US', { month: 'long' })} ${date.getFullYear()}`;
const today = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
const daysAhead = (days: number) => {
  const base = today();
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
};

/** Open the venue's calendar and wait for its slots. */
function openCalendar(venueId: string): void {
  cy.interceptOperation('VenueSlots');
  cy.visitApp(`/venues/${venueId}/availability`);
  cy.wait('@VenueSlots');
  cy.byTestId('availability-calendar').should('be.visible');
}

/** Step the month view forward to `date` and open its day drawer. */
function openDay(date: Date): void {
  const target = monthLabel(date);
  const step = (left: number): void => {
    cy.byTestId('availability-period')
      .invoke('text')
      .then((label) => {
        if (label === target) return;
        if (left === 0) throw new Error(`The calendar never reached ${target}.`);
        cy.byTestId('availability-period-next').click();
        step(left - 1);
      });
  };
  step(3);
  cy.byTestId(`availability-day-${ymd(date)}`).click();
  cy.byTestId('availability-day-sheet').should('be.visible');
}

describe('Partners UI · Venue availability', () => {
  let world: PartnerWorld;
  let originalHolidays: string[] | null = null;
  let wholeDaySlotId = '';

  before(() => {
    signInPartner();
    loadCopy();
    findPartnerWorld().then((found) => {
      world = found;
    });
  });

  beforeEach(() => {
    signInPartner();
  });

  after(() => {
    signInPartner();
    if (wholeDaySlotId) {
      cy.gql<{ venueSlots: Array<{ id: string }> }>(SLOTS, { venue: world.venue.id }).then(({ venueSlots }) => {
        if (venueSlots.some((slot) => slot.id === wholeDaySlotId)) cy.gql(DELETE_SLOT, { id: wholeDaySlotId });
      });
    }
    if (originalHolidays) {
      cy.gql(SET_HOLIDAYS, { id: world.venue.id, input: { holidays: originalHolidays } });
    }
  });

  it('VA-01 the draft venue’s calendar is refused with its status, and Back to venues returns to the list', () => {
    cy.visitApp(`/venues/${world.draftVenue.id}/availability`);
    cy.byTestId('availability-blocked').should(
      'have.text',
      copyOf(
        'partners.venueAvailabilityPage.approvalRequired',
        'Availability is only editable once your venue is approved (current status: {status}).',
        { status: 'DRAFT' },
      ),
    );
    cy.byTestId('availability-calendar').should('not.exist');
    cy.byTestId('availability-back-to-venues').click();
    cy.location('pathname').should('eq', '/register-venue');
  });

  it('VA-02 another partner’s venue is not found here, and the server refuses its slots', () => {
    foreignVenueId(world).then((foreign) => {
      cy.visitApp(`/venues/${foreign}/availability`);
      cy.byTestId('availability-blocked').should(
        'have.text',
        copyOf('partners.venueAvailabilityPage.venueNotFoundOrItIsn', "Venue not found, or it isn't yours."),
      );
      cy.gqlError(SLOTS, { venue: foreign }).should('eq', 'Only the venue owner can view all slots');
    });
  });

  it('VA-03 the calendar opens on this month, Next stops at the 60-day window, and Back opens the venue list', () => {
    openCalendar(world.venue.id);
    cy.byTestId('availability-view-month').should('have.attr', 'aria-pressed', 'true');
    cy.byTestId('availability-period').should('have.text', monthLabel(today()));
    const limit = daysAhead(MAX_FUTURE_DAYS);
    let steps = 0;
    for (let month = 0; ; month += 1) {
      const shown = new Date(today().getFullYear(), today().getMonth() + month, 1);
      const lastDay = new Date(shown.getFullYear(), shown.getMonth() + 1, 0, 23, 59, 59, 999);
      if (lastDay >= limit) break;
      steps += 1;
    }
    Cypress._.times(steps, () => cy.byTestId('availability-period-next').should('be.enabled').click());
    cy.byTestId('availability-period-next').should('be.disabled');
    cy.byTestId('availability-period').should(
      'have.text',
      monthLabel(new Date(today().getFullYear(), today().getMonth() + steps, 1)),
    );
    cy.byTestId('availability-today').click();
    cy.byTestId('availability-period').should('have.text', monthLabel(today()));
    cy.byTestId('availability-header-back').click();
    cy.location('pathname').should('eq', '/register-venue');
  });

  it('VA-04 a whole-day slot is added from the day drawer, blocked, unblocked and deleted', () => {
    const day = daysAhead(WHOLE_DAY_OFFSET);
    const note = marked('whole day slot');
    openCalendar(world.venue.id);
    openDay(day);
    cy.byTestId('add-slot-whole-day').click();
    cy.byTestId('add-slot-start-time').should('not.exist');
    cy.byTestId('add-slot-notes-input').type(note);
    cy.interceptOperation('CreateVenueSlots');
    cy.byTestId('add-slot-submit').click();
    cy.wait('@CreateVenueSlots').then(({ request, response }) => {
      expect(request.body.variables.input.on_conflict, 'on_conflict').to.equal('FAIL');
      expect(request.body.variables.input.slots[0].whole_day, 'whole_day').to.equal(true);
      wholeDaySlotId = response?.body?.data?.createVenueSlots?.[0]?.id ?? '';
      expect(wholeDaySlotId, 'the created slot').to.not.equal('');
    });
    cy.then(() => {
      const card = `day-slot-${wholeDaySlotId}`;
      cy.byTestId(card).should('contain.text', note);
      cy.byTestId(`${card}-status`).should('have.text', 'AVAILABLE');
      cy.interceptOperation('UpdateVenueSlot');
      cy.byTestId(`${card}-block`).click();
      cy.wait('@UpdateVenueSlot').its('request.body.variables.input.block').should('eq', true);
      cy.byTestId(`${card}-status`).should('have.text', 'BLOCKED');
      cy.byTestId(`${card}-block`).click();
      cy.wait('@UpdateVenueSlot').its('request.body.variables.input.block').should('eq', false);
      cy.byTestId(`${card}-status`).should('have.text', 'AVAILABLE');
      cy.byTestId(`${card}-delete`).click();
      cy.byTestId('day-slot-delete-confirm').should('be.visible');
      cy.interceptOperation('DeleteVenueSlot');
      cy.byTestId('day-slot-delete-confirm-btn').click();
      cy.wait('@DeleteVenueSlot').its('response.body.data.deleteVenueSlot').should('eq', true);
      cy.byTestId(card).should('not.exist');
    });
  });

  it('VA-05 the free pod’s booked slot shows BOOKED with its pod and offers no block or delete', () => {
    cy.gql<{ venueSlots: Array<{ id: string; start_at: string }> }>(SLOTS, { venue: world.venue.id }).then(
      ({ venueSlots }) => {
        const booked = venueSlots.find((slot) => slot.id === world.pod.slotId);
        if (!booked) throw new Error('The free pod’s slot is not among the venue’s slots.');
        openCalendar(world.venue.id);
        openDay(new Date(booked.start_at));
      },
    );
    const card = `day-slot-${world.pod.slotId}`;
    cy.byTestId(`${card}-status`).should('have.text', 'BOOKED');
    cy.byTestId(card).should('contain.text', world.pod.title);
    cy.byTestId(`${card}-block`).should('not.exist');
    cy.byTestId(`${card}-delete`).should('not.exist');
  });

  it('VA-06 a leave day is marked in the drawer, hides the add form, and the server refuses a slot on it', () => {
    const day = daysAhead(LEAVE_DAY_OFFSET);
    cy.gql<{ myVenue: { settings: { holidays: string[] } } }>(VENUE_SETTINGS, { id: world.venue.id }).then(
      ({ myVenue }) => {
        originalHolidays = myVenue.settings.holidays;
        const holidays = [...new Set([...myVenue.settings.holidays, ymd(day)])];
        cy.gql(SET_HOLIDAYS, { id: world.venue.id, input: { holidays } });
      },
    );
    openCalendar(world.venue.id);
    openDay(day);
    cy.byTestId('availability-holiday-alert').should(
      'have.text',
      copyOf(
        'availability.holidayAlert',
        'This date is marked as a venue leave/holiday — slots cannot be added or booked.',
      ),
    );
    cy.byTestId('add-slot-submit').should('not.be.visible');
    const start = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 6));
    const slot = {
      start_at: start.toISOString(),
      end_at: new Date(start.getTime() + DAY_MS / 24).toISOString(),
      price: 0,
      capacity: world.venue.capacity,
      notes: marked('leave day slot'),
    };
    cy.gqlError(CREATE_SLOT, { input: { venue_id: world.venue.id, slots: [slot] } }).should(
      'eq',
      `${ymd(day)} is marked as a venue leave/holiday`,
    );
  });

  it('VA-07 the recurring dialog closes without creating anything, and fills the screen on a phone', () => {
    const create = countOperation('CreateVenueSlots');
    cy.viewport(390, 844);
    openCalendar(world.venue.id);
    cy.byTestId('availability-recurring').click();
    cy.byTestId('recurring-sheet').find('.MuiDialog-paper').should('have.class', 'MuiDialog-paperFullScreen');
    cy.byTestId('recurring-create').should('be.disabled');
    cy.byTestId('recurring-cancel').click();
    cy.byTestId('recurring-sheet').should('not.exist');
    expectNotSent(create, 'CreateVenueSlots');
  });
});
