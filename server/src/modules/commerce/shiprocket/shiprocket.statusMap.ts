import type { FulfilmentStatus } from '@modules/commerce/productOrder/productOrder.model';

/**
 * Map a ShipRocket status label (their tracking `current_status` / activity
 * text) to our FulfilmentStatus. ShipRocket has dozens of granular states; we
 * fold them into our lifecycle. Unknown labels fall back to a safe bucket so a
 * new ShipRocket status never crashes or hides the timeline.
 */
const RTO = new Set([
  'RTO INITIATED',
  'RTO DELIVERED',
  'RTO IN TRANSIT',
  'RTO ACKNOWLEDGED',
]);
const CANCELLED = new Set(['CANCELED', 'CANCELLED', 'CANCELLATION REQUESTED']);
const DELIVERED = new Set(['DELIVERED']);
const OUT_FOR_DELIVERY = new Set(['OUT FOR DELIVERY']);
const PICKUP_SCHEDULED = new Set([
  'PICKUP SCHEDULED',
  'PICKUP GENERATED',
  'PICKUP QUEUED',
  'MANIFEST GENERATED',
  'AWB ASSIGNED',
]);

export function mapShiprocketStatus(raw: string | null | undefined): FulfilmentStatus {
  const s = String(raw ?? '').trim().toUpperCase();
  if (!s) return 'AWAITING_SHIPMENT';
  if (RTO.has(s) || s.startsWith('RTO')) return 'RTO';
  if (CANCELLED.has(s)) return 'CANCELLED';
  if (DELIVERED.has(s)) return 'DELIVERED';
  if (OUT_FOR_DELIVERY.has(s)) return 'OUT_FOR_DELIVERY';
  if (PICKUP_SCHEDULED.has(s)) return 'PICKUP_SCHEDULED';
  if (s.includes('OUT FOR DELIVERY')) return 'OUT_FOR_DELIVERY';
  if (s.includes('DELIVERED')) return 'DELIVERED';
  // "IN TRANSIT", "SHIPPED", "REACHED AT DESTINATION HUB", etc.
  if (s.includes('TRANSIT') || s.includes('SHIPPED') || s.includes('DISPATCHED')) return 'SHIPPED';
  if (s.includes('PICKUP') || s.includes('MANIFEST') || s.includes('AWB')) return 'PICKUP_SCHEDULED';
  return 'SHIPPED';
}
