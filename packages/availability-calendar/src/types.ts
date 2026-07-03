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
}

/** Payload for adding a slot — the editor builds this and hands it to the host app. */
export interface NewSlotInput {
  start_at: string;
  end_at: string;
  price: number;
  notes: string;
}
