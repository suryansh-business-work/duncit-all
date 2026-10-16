/**
 * What a venue charges for one booked slot, by the slot's pricing mode.
 *
 *  - FLAT     — `price` is the whole slot (the original, and the default).
 *  - HOURLY   — `price` is per hour of the slot's own window.
 *  - PER_PAX  — `price` is per person at the pod.
 *
 * On top, `overtime_rate` is charged per hour the pod runs past the slot's end
 * (entered when the pod is completed). Every amount is rupees, rounded to
 * paise. The server's settlement and its live views use this; the apps carry a
 * twin in `@duncit/utils` (`slotVenueCharge`) so the price panel a host sees
 * while creating a pod is the same number the settlement will use.
 */

export type SlotPricingMode = 'FLAT' | 'HOURLY' | 'PER_PAX';
export const SLOT_PRICING_MODES: readonly SlotPricingMode[] = ['FLAT', 'HOURLY', 'PER_PAX'];

export interface SlotChargeSource {
  price?: number | null;
  pricing_mode?: string | null;
  overtime_rate?: number | null;
  start_at?: Date | string | null;
  end_at?: Date | string | null;
}

export interface SlotCharge {
  mode: SlotPricingMode;
  /** The slot itself, by its mode. */
  base: number;
  /** Hours past the slot's end × the overtime rate. */
  overtime: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const pricingModeOf = (raw: string | null | undefined): SlotPricingMode =>
  raw === 'HOURLY' || raw === 'PER_PAX' ? raw : 'FLAT';

/** The slot's own length in hours (0 for a slot with no usable window). */
export function slotHours(slot: SlotChargeSource): number {
  const start = slot.start_at ? new Date(slot.start_at).getTime() : Number.NaN;
  const end = slot.end_at ? new Date(slot.end_at).getTime() : Number.NaN;
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return (end - start) / 3_600_000;
}

/**
 * The venue's charge for a slot. `pax` matters only to a PER_PAX slot and is
 * the number of people at the pod; `overtimeHours` is how long the pod ran past
 * the slot's end. Negative or missing inputs count as zero.
 */
export function slotVenueCharge(
  slot: SlotChargeSource,
  opts: { pax?: number | null; overtimeHours?: number | null } = {}
): SlotCharge {
  const mode = pricingModeOf(slot.pricing_mode);
  const price = Math.max(0, Number(slot.price) || 0);
  const pax = Math.max(0, Math.floor(Number(opts.pax) || 0));
  let base = price;
  if (mode === 'HOURLY') base = price * slotHours(slot);
  else if (mode === 'PER_PAX') base = price * pax;
  const overtime = Math.max(0, Number(slot.overtime_rate) || 0) * Math.max(0, Number(opts.overtimeHours) || 0);
  return { mode, base: round2(base), overtime: round2(overtime), total: round2(base + overtime) };
}
