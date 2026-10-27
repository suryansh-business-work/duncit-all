/// <reference types="cypress" />
import { expectRefused } from '../../../support/access-steps';
import { expectAnswer, marked, refusal } from '../../../support/api-apps';
import {
  ensureFreePod,
  ensureOpenSlot,
  signInRunPartner,
  utcDayAt,
  type FixtureWorld,
  type SlotRow,
} from '../../../support/fixture-world';

/**
 * Venue availability, as the owner of the run's own venue. Scenario map:
 * Partners › Venue availability ("Server window limits", and the data-integrity
 * note: a bulk change never touches a booked slot).
 *
 * venueSlot.service.ts createSlotsCore checks every new slot's window
 * (validateSlotWindow: end after start, not in the past, inside the venue's
 * advance window, at most 60 days long, never on a leave day), then its price
 * and capacity, then the batch against the venue's slots in the caller's
 * conflict mode, then the batch against itself. A BOOKED slot — the run's free
 * pod holds one — cannot be edited, deleted, replaced or bulk-deleted.
 * Every slot this spec makes is on days no other fixture spec uses, and is
 * deleted again before it ends.
 */

const HOUR_MS = 60 * 60 * 1000;

const CREATE = `mutation E2eFixtureSlotsCreate($input: BulkCreateVenueSlotsInput!) {
  createVenueSlots(input: $input) { id status }
}`;
const UPDATE = `mutation E2eFixtureSlotUpdate($id: ID!, $input: UpdateVenueSlotInput!) {
  updateVenueSlot(slot_id: $id, input: $input) { id status }
}`;
const DELETE = `mutation E2eFixtureSlotDelete($id: ID!) { deleteVenueSlot(slot_id: $id) }`;
const BULK_DELETE = `mutation E2eFixtureSlotsBulkDelete($input: BulkDeleteVenueSlotsInput!) {
  bulkDeleteVenueSlots(input: $input) { matched affected skipped }
}`;
const AVAILABLE = `query E2eFixtureSlotsOpen($venue: ID!) { venueAvailableSlots(venue_id: $venue) { id } }`;
const SLOTS = `query E2eFixtureSlotsAll($venue: ID!) { venueSlots(venue_id: $venue) { id status } }`;
const RULES = `query E2eFixtureVenueRules($id: ID) { myVenue(venue_id: $id) { settings { rules { max_advance_days } } } }`;
const SETTINGS = `mutation E2eFixtureVenueHolidays($id: ID!, $input: VenueSettingsInput!) {
  updateVenueSettings(venue_doc_id: $id, input: $input) { settings { holidays } }
}`;

/** A two-hour window starting `days` ahead at `hour`:00 UTC. */
const windowAt = (days: number, hour: number, extra: Record<string, unknown> = {}) => {
  const start = utcDayAt(days, hour);
  return { start_at: start, end_at: new Date(Date.parse(start) + 2 * HOUR_MS).toISOString(), ...extra };
};

describe('API · Venue availability: the owner’s own slots and their limits', { testIsolation: false }, () => {
  let token = '';
  let world: FixtureWorld;
  let slot: SlotRow;

  const create = (slots: unknown[], onConflict?: string) =>
    cy.gqlRaw(CREATE, { input: { venue_id: world.venue.id, slots, on_conflict: onConflict } }, { token });

  before(() => {
    signInRunPartner().then((partner) => {
      token = partner;
      ensureFreePod(partner).then((built) => {
        world = built;
        ensureOpenSlot(partner, built.venue.id, { note: marked('availability slot'), days: 21, hour: 12 }).then((open) => {
          slot = open;
        });
      });
    });
  });

  it('VAV-01 a slot that ends before it starts, starts in the past or spans over 60 days is refused', () => {
    const start = utcDayAt(22, 12);
    create([{ start_at: start, end_at: utcDayAt(22, 11) }]).then((body) =>
      expectRefused('createVenueSlots', body, refusal('BAD_USER_INPUT', 'end_at must be after start_at')),
    );
    create([windowAt(-2, 10)]).then((body) =>
      expectRefused('createVenueSlots', body, refusal('BAD_USER_INPUT', 'Cannot create slots in the past')),
    );
    create([{ start_at: start, end_at: utcDayAt(22 + 61, 12) }]).then((body) =>
      expectRefused('createVenueSlots', body, refusal('BAD_USER_INPUT', 'A slot cannot span more than 60 days')),
    );
  });

  it('VAV-02 a slot past the venue’s advance window, a negative price or capacity, or no slot at all is refused', () => {
    cy.gql(RULES, { id: world.venue.id }, { token }).then(({ myVenue }) => {
      const days: number = myVenue.settings.rules.max_advance_days;
      create([windowAt(days + 2, 10)]).then((body) =>
        expectRefused(
          'createVenueSlots',
          body,
          refusal('BAD_USER_INPUT', `Slots can only be scheduled up to ${days} days in advance`),
        ),
      );
    });
    create([windowAt(22, 12, { price: -1 })]).then((body) =>
      expectRefused('createVenueSlots', body, refusal('BAD_USER_INPUT', 'price must be 0 or more')),
    );
    create([windowAt(22, 12, { capacity: -1 })]).then((body) =>
      expectRefused('createVenueSlots', body, refusal('BAD_USER_INPUT', 'capacity must be 0 or more')),
    );
    create([]).then((body) =>
      expectRefused('createVenueSlots', body, refusal('BAD_USER_INPUT', 'At least one slot is required')),
    );
  });

  it('VAV-03 two new slots of one batch may not overlap, whatever the conflict mode', () => {
    const overlapping = [windowAt(22, 12), windowAt(22, 13)];
    const selfOverlap = refusal('CONFLICT', 'Two of the new slots overlap with each other');
    create(overlapping).then((body) => expectRefused('createVenueSlots', body, selfOverlap));
    create(overlapping, 'SKIP').then((body) => expectRefused('createVenueSlots', body, selfOverlap));
  });

  it('VAV-04 a new slot over an existing one fails, is skipped, and never replaces a booked one', () => {
    const same = [{ start_at: slot.start_at, end_at: new Date(Date.parse(slot.start_at) + 2 * HOUR_MS).toISOString() }];
    const overlaps = `Overlaps with existing slot ${same[0].start_at} – ${same[0].end_at}`;
    create(same).then((body) => expectRefused('createVenueSlots', body, refusal('CONFLICT', overlaps)));
    create(same, 'SKIP').then((body) =>
      expectRefused('createVenueSlots', body, refusal('CONFLICT', 'Every matching slot already exists — nothing to add.')),
    );
    const onPodSlot = [windowAt(14, 10)];
    create(onPodSlot, 'REPLACE').then((body) =>
      expectRefused(
        'createVenueSlots',
        body,
        refusal('CONFLICT', 'Every new slot overlaps a booked slot or a pending request, which cannot be replaced.'),
      ),
    );
  });

  it('VAV-05 the owner blocks a slot (it leaves the bookable list), opens it again, and deletes it', () => {
    const listed = () =>
      cy
        .gql<{ venueAvailableSlots: Array<{ id: string }> }>(AVAILABLE, { venue: world.venue.id }, { token })
        .then(({ venueAvailableSlots }) => venueAvailableSlots.map((row) => row.id));
    cy.gqlRaw(UPDATE, { id: slot.id, input: { block: true } }, { token }).then((body) =>
      expectAnswer('updateVenueSlot', body, { id: slot.id, status: 'BLOCKED' }),
    );
    listed().then((ids) => expect(ids, 'bookable slots while blocked').to.not.include(slot.id));
    cy.gqlRaw(UPDATE, { id: slot.id, input: { block: false } }, { token }).then((body) =>
      expectAnswer('updateVenueSlot', body, { id: slot.id, status: 'AVAILABLE' }),
    );
    listed().then((ids) => expect(ids, 'bookable slots once open').to.include(slot.id));
    cy.gqlRaw(DELETE, { id: slot.id }, { token }).then((body) => expectAnswer('deleteVenueSlot', body, true));
    cy.gql<{ venueSlots: Array<{ id: string }> }>(SLOTS, { venue: world.venue.id }, { token }).then(({ venueSlots }) => {
      expect(venueSlots.map((row) => row.id), 'slots after the delete').to.not.include(slot.id);
    });
  });

  it('VAV-06 the free pod’s booked slot cannot be edited or deleted', () => {
    cy.gqlRaw(UPDATE, { id: world.pod.slotId, input: { notes: marked('booked slot edit') } }, { token }).then((body) =>
      expectRefused('updateVenueSlot', body, refusal('BAD_REQUEST', 'Booked slots cannot be edited. Cancel the pod first.')),
    );
    cy.gqlRaw(DELETE, { id: world.pod.slotId }, { token }).then((body) =>
      expectRefused('deleteVenueSlot', body, refusal('BAD_REQUEST', 'Booked slots cannot be deleted. Cancel the pod first.')),
    );
  });

  it('VAV-07 a bulk delete takes the open slots of a day and leaves the booked one', () => {
    create([windowAt(14, 16, { notes: marked('bulk delete slot') })]).then((body) => {
      expect(body.errors, 'createVenueSlots errors').to.be.undefined;
    });
    const input = { venue_id: world.venue.id, from: utcDayAt(14, 0), to: utcDayAt(15, 0) };
    cy.gqlRaw(BULK_DELETE, { input }, { token }).then((body) =>
      expectAnswer('bulkDeleteVenueSlots', body, { matched: 1, affected: 1, skipped: 0 }),
    );
    cy.gql<{ venueSlots: Array<{ id: string; status: string }> }>(SLOTS, { venue: world.venue.id }, { token }).then(
      ({ venueSlots }) => {
        expect(venueSlots, 'the booked slot').to.deep.include({ id: world.pod.slotId, status: 'BOOKED' });
      },
    );
  });

  it('VAV-08 no slot can be made on a day the venue marked as leave', () => {
    const start = utcDayAt(25, 12);
    const ymd = start.slice(0, 10);
    cy.gqlRaw(SETTINGS, { id: world.venue.id, input: { holidays: [ymd] } }, { token }).then((body) =>
      expectAnswer('updateVenueSettings', body, { settings: { holidays: [ymd] } }),
    );
    create([windowAt(25, 12)]).then((body) =>
      expectRefused('createVenueSlots', body, refusal('BAD_REQUEST', `${ymd} is marked as a venue leave/holiday`)),
    );
    cy.gqlRaw(SETTINGS, { id: world.venue.id, input: { holidays: [] } }, { token }).then((body) =>
      expectAnswer('updateVenueSettings', body, { settings: { holidays: [] } }),
    );
  });
});
