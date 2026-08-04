/** PENDING = a host's booking request is waiting for the venue's approval. */
export type VenueSlotStatus = 'AVAILABLE' | 'PENDING' | 'BOOKED' | 'BLOCKED';

export type CalendarView = 'month' | 'week' | 'day';

/** A single bookable time window for a venue. Shared shape across portals. */
export interface VenueSlotRow {
  id: string;
  venue_id: string;
  start_at: string;
  end_at: string;
  price: number;
  status: VenueSlotStatus;
  booked_by_pod_id: string | null;
  booked_pod_title: string | null;
  notes: string;
  created_at: string;
  /** The venue space this slot is for ('' = whole venue). */
  space_label?: string;
  /** Guests this slot holds — the space's capacity (0 = unset). */
  capacity?: number;
}

/**
 * One of the venue's capacity entries (e.g. "Court 1", holds 4). A venue that
 * lists spaces sells each one separately, so every slot belongs to exactly one.
 */
export interface VenueSpace {
  label: string;
  capacity: number;
}

/** Payload for adding a slot — the editor builds this and hands it to the host app. */
export interface NewSlotInput {
  start_at: string;
  end_at: string;
  price: number;
  notes: string;
  /** Omitted / '' when the venue has no named spaces (whole-venue slot). */
  space_label?: string;
  capacity?: number;
}
