import type { VenueSlotRow } from '../src/types';

let seq = 0;

/** Builds a VenueSlotRow with sane defaults; pass overrides for the fields a test cares about. */
export function makeSlot(overrides: Partial<VenueSlotRow> = {}): VenueSlotRow {
  seq += 1;
  return {
    id: `slot-${seq}`,
    venue_id: 'venue-1',
    start_at: '2026-01-15T09:00:00.000Z',
    end_at: '2026-01-15T10:00:00.000Z',
    price: 0,
    status: 'AVAILABLE',
    booked_by_pod_id: null,
    booked_pod_title: null,
    notes: '',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
