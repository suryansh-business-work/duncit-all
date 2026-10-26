/// <reference types="cypress" />
import { signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectEachRefused, foreignVenueId } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Venue availability (/venues/availability) — a venue's slots are its owner's
 * to create, read, block and delete (venues/venueSlot/venueSlot.service.ts).
 * `ensureOwnedVenue` finds the venue by id AND owner, so a missing venue and
 * someone else's answer alike; a slot is owner-checked after it is loaded.
 * Scenario map: Partners › Venue availability ("VENUE_OWNER cannot create,
 * block or delete slots of another venue").
 */

const CREATE = `mutation E2eCreateVenueSlots($input: BulkCreateVenueSlotsInput!) {
  createVenueSlots(input: $input) { id }
}`;
const BULK_DELETE = `mutation E2eBulkDeleteVenueSlots($input: BulkDeleteVenueSlotsInput!) {
  bulkDeleteVenueSlots(input: $input) { affected }
}`;
const LIST = `query E2eVenueSlots($venue_id: ID!) { venueSlots(venue_id: $venue_id) { id } }`;
const BLOCK = `mutation E2eBlockVenueSlot($id: ID!) { updateVenueSlot(slot_id: $id, input: { block: true }) { id } }`;
const DELETE = `mutation E2eDeleteVenueSlot($id: ID!) { deleteVenueSlot(slot_id: $id) }`;

const NOT_OWNED: Refusal = { code: 'NOT_FOUND', message: 'Venue not found or not yours' };
const SLOT_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Slot not found' };

describe('API · Venue slots are managed by the venue’s owner only', { testIsolation: false }, () => {
  let memberToken = '';
  let foreignId = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    foreignVenueId().then((id) => {
      foreignId = id;
    });
  });

  it('VA-01 slots cannot be created at another owner’s venue, nor at one that does not exist', () => {
    // No slots at all: should the ownership check ever break, "At least one slot is required" still stops the write.
    expectEachRefused('createVenueSlots', CREATE, { input: { venue_id: foreignId, slots: [] } }, [
      [null, SIGNED_OUT],
      [memberToken, NOT_OWNED],
    ]);
    expectEachRefused('createVenueSlots', CREATE, { input: { venue_id: NO_ID, slots: [] } }, [[memberToken, NOT_OWNED]]);
  });

  it('VA-02 another owner’s full calendar is not readable', () => {
    expectEachRefused('venueSlots', LIST, { venue_id: foreignId }, [
      [null, SIGNED_OUT],
      [memberToken, { code: 'FORBIDDEN', message: 'Only the venue owner can view all slots' }],
    ]);
  });

  it('VA-03 a bulk delete names only the caller’s own venues', () => {
    // NO_ID only: a destructive call is never aimed at a real venue.
    expectEachRefused('bulkDeleteVenueSlots', BULK_DELETE, { input: { venue_id: NO_ID } }, [
      [null, SIGNED_OUT],
      [memberToken, NOT_OWNED],
    ]);
  });

  it('VA-04 a slot that is not the caller’s cannot be blocked or deleted', () => {
    expectEachRefused('updateVenueSlot', BLOCK, { id: NO_ID }, [
      [null, SIGNED_OUT],
      [memberToken, SLOT_NOT_FOUND],
    ]);
    expectEachRefused('deleteVenueSlot', DELETE, { id: NO_ID }, [
      [null, SIGNED_OUT],
      [memberToken, SLOT_NOT_FOUND],
    ]);
  });
});
