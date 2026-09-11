import type { PodRow } from './queries';
import { formatDateTime } from '@duncit/app-settings';
import { podSeatsTaken } from '@duncit/utils';

export const POD_MODE_OPTIONS = [
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'VIRTUAL', label: 'Virtual' },
] as const;

export const POD_TYPE_OPTIONS = [
  'NATIVE_FREE',
  'NATIVE_PAID',
  'NATIVE_PAID_PREMIUM',
  'NON_NATIVE_FREE',
  'NON_NATIVE_PAID',
].map((value) => ({ value, label: value.replaceAll('_', ' ') }));

export const modeLabel = (p: PodRow) => (p.pod_mode === 'VIRTUAL' ? 'Virtual' : 'Physical');

export const typeValue = (p: PodRow) => `${modeLabel(p)} · ${p.pod_type.replaceAll('_', ' ')}`;

export const statusValue = (p: PodRow) => {
  if (p.is_deleted) return 'Cancelled';
  if (p.completed_at) return 'Completed';
  if (p.cancellation_risk?.at_risk) return 'Cancellation risk';
  if (p.venue_approval_status === 'PENDING') return 'Awaiting venue';
  if (p.venue_approval_status === 'DECLINED') return 'Venue rejected';
  return p.is_active ? 'Active' : 'Draft';
};

export const productLines = (p: PodRow) =>
  (p.product_requests ?? []).map((i) => `${i.product_name}: ${i.quantity}`).join(', ');

export const productsValue = (p: PodRow) => {
  const items = p.product_requests ?? [];
  if (items.length === 0) return '—';
  return `${productLines(p)} · ₹${p.product_cost_total ?? 0}`;
};

/**
 * How full a pod is, and how many bookings hold it.
 *
 * `pod_attendees` is an IDENTITY list — a booking for seven seats writes one
 * id into it — so the column that counted that list reported a full pod as
 * nearly empty. `seats_taken` is the server's own arithmetic (attendees +
 * `extra_seats`); `podSeatsTaken` falls back to the list for a query that has
 * not been taught to select it.
 */
export interface PodSpotCounts {
  /** Seats held, every extra seat of a multi-seat booking included. */
  seats: number;
  /** Bookings behind those seats — one per person, hosts included. */
  people: number;
  /** Seats beyond the first of each booking: the multi-seat part. */
  extraSeats: number;
  /** Declared capacity. 0 means the pod set none. */
  total: number;
}

export const podSpotCounts = (p: PodRow): PodSpotCounts => {
  const seats = podSeatsTaken(p);
  const people = p.pod_attendees?.length ?? 0;
  return { seats, people, extraSeats: Math.max(seats - people, 0), total: p.no_of_spots ?? 0 };
};

export const spotsValue = (p: PodRow) => {
  const { seats, total } = podSpotCounts(p);
  return total > 0 ? `${seats} / ${total}` : String(seats);
};

export const dateValue = (iso?: string | null) => (iso ? formatDateTime(iso) : '—');
