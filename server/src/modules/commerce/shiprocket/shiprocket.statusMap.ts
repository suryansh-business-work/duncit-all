import type { FulfilmentStatus } from '@modules/commerce/productOrder/productOrder.model';

/**
 * ShipRocket's status labels → our order lifecycle.
 *
 * ShipRocket has dozens of granular states ("REACHED AT DESTINATION HUB",
 * "PICKUP RESCHEDULED", …); an order has a handful. The raw label is still
 * stored on every tracking event, so the timeline keeps the detail.
 *
 * An unknown label maps to null — "no change" — rather than a guess: a new
 * ShipRocket state must never move an order somewhere it isn't.
 */

type Rule = { match: (s: string) => boolean; status: FulfilmentStatus };

const has = (...words: string[]) => (s: string) => words.some((w) => s.includes(w));

/** First match wins, so the specific phrases sit above the words they contain. */
const RULES: Rule[] = [
  { match: has('RTO DELIVERED'), status: 'RTO_DELIVERED' },
  { match: (s) => s.startsWith('RTO') || s.includes('RETURN TO ORIGIN'), status: 'RTO' },
  { match: has('UNDELIVERED', 'NDR', 'DELIVERY FAILED', 'DELIVERY ATTEMPTED'), status: 'NDR' },
  { match: has('LOST', 'UNTRACEABLE', 'DESTROYED', 'DISPOSED'), status: 'LOST' },
  { match: (s) => s === 'CANCELED' || s === 'CANCELLED' || s.includes('CANCELLED BEFORE'), status: 'CANCELLED' },
  { match: has('OUT FOR DELIVERY'), status: 'OUT_FOR_DELIVERY' },
  { match: has('DELIVERED'), status: 'DELIVERED' },
  { match: has('PICKED UP', 'IN TRANSIT', 'SHIPPED', 'DISPATCHED', 'REACHED', 'DELAYED', 'MISROUTED', 'IN FLIGHT'), status: 'SHIPPED' },
  { match: has('PICKUP', 'MANIFEST'), status: 'PICKUP_SCHEDULED' },
  { match: has('AWB ASSIGNED'), status: 'AWB_ASSIGNED' },
];

/** Our status for a ShipRocket label, or null when the label says nothing we track. */
export function mapShiprocketStatus(raw: string | null | undefined): FulfilmentStatus | null {
  const s = String(raw ?? '').trim().toUpperCase().replaceAll('_', ' ');
  if (!s) return null;
  return RULES.find((rule) => rule.match(s))?.status ?? null;
}

/**
 * How far along an order is. Tracking only ever moves an order forward: a
 * late "IN TRANSIT" webhook must not pull a delivered order back. The
 * in-flight states share a rank so a parcel can go out for delivery, fail
 * (NDR) and go out again. Terminal states never change.
 */
const RANK: Record<FulfilmentStatus, number> = {
  PENDING: 0,
  FAILED: 0,
  AWAITING_SHIPMENT: 0,
  READY_FOR_PICKUP: 0,
  AWB_ASSIGNED: 1,
  PICKUP_SCHEDULED: 2,
  SHIPPED: 3,
  OUT_FOR_DELIVERY: 3,
  NDR: 3,
  RTO: 5,
  DELIVERED: 9,
  RTO_DELIVERED: 9,
  LOST: 9,
  CANCELLED: 9,
  PICKED_UP: 9,
};

export const isFinalStatus = (status: FulfilmentStatus) => RANK[status] >= 9;

/** The status an order moves to when tracking reports `incoming`, or null to stay put. */
export function nextStatus(current: FulfilmentStatus, incoming: FulfilmentStatus | null): FulfilmentStatus | null {
  if (!incoming || incoming === current || isFinalStatus(current)) return null;
  return RANK[incoming] >= RANK[current] ? incoming : null;
}
