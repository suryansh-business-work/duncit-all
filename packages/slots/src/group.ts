import type { CalendarSlot, SlotDay, SlotFormatter } from './types';

const DAY_MS = 86_400_000;

/**
 * Re-offer a slot the picker would otherwise drop. Editing a pod is the case
 * that needs it: the pod's own slot is booked, so the venue no longer lists it
 * as available, and without this the form would clear a valid saved choice.
 */
export function withCurrentSlot<T extends CalendarSlot>(
  available: readonly T[],
  current: T | null | undefined,
): T[] {
  if (!current) return [...available];
  if (available.some((slot) => slot.id === current.id)) return [...available];
  return [current, ...available];
}

/**
 * Bucket slots into ascending calendar days, in the ADMIN-configured zone rather
 * than the device's — two people in different zones must see a slot under the
 * same day. Order inside a day follows start time.
 */
export function groupSlotsByDay<T extends CalendarSlot>(
  slots: readonly T[],
  fmt: SlotFormatter,
): SlotDay<T>[] {
  const byDay = new Map<string, T[]>();
  for (const slot of slots) {
    const key = fmt.dayKey(slot.start_at);
    if (!key) continue; // an unparseable start_at would otherwise create a '' day
    const bucket = byDay.get(key);
    if (bucket) bucket.push(slot);
    else byDay.set(key, [slot]);
  }
  // `[...x].sort()` rather than `toSorted()`: this file also runs under Hermes,
  // where the ES2023 array copy methods are not universally available.
  return [...byDay.entries()]
    .map(([key, daySlots]) => ({
      key,
      slots: [...daySlots].sort((a, b) => a.start_at.localeCompare(b.start_at)),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Which day the time tiles should show: an explicit tap wins, then the day of
 * the current selection, then the first day that has slots.
 *
 * It resolves a DAY only — never a slot. Auto-selecting a "nearest" slot here
 * would silently re-route a live booking when an edit form hydrates.
 */
export function resolveSlotDay<T extends CalendarSlot>(
  days: readonly SlotDay<T>[],
  selectedSlotId: string,
  override: string | null,
): { activeDay: string; daySlots: T[] } {
  const selected = selectedSlotId
    ? days.find((day) => day.slots.some((slot) => slot.id === selectedSlotId))
    : undefined;
  const activeDay = override ?? selected?.key ?? days[0]?.key ?? '';
  return { activeDay, daySlots: days.find((day) => day.key === activeDay)?.slots ?? [] };
}

/** Day keys that hold at least one slot — drives which calendar days are enabled. */
export function slotDayKeys<T extends CalendarSlot>(days: readonly SlotDay<T>[]): Set<string> {
  return new Set(days.map((day) => day.key));
}

/**
 * The bookable window, from the data rather than a hardcoded horizon, so the
 * calendar cannot page into months that can never hold a slot.
 */
export function slotDayBounds<T extends CalendarSlot>(
  days: readonly SlotDay<T>[],
): { first: string; last: string } | null {
  const [first] = days;
  if (!first) return null;
  // Reduced rather than read off the end: no index arithmetic, and the bounds
  // stay correct even if a caller hands over an unsorted list.
  const last = days.reduce((latest, day) => (day.key > latest.key ? day : latest), first);
  return { first: first.key, last: last.key };
}

/**
 * Today / Tomorrow / the admin-configured date format. Relative to the
 * formatter's clock, so an admin-set time also moves what "Today" means.
 */
export function slotDayLabel(
  dayKey: string,
  fmt: SlotFormatter,
  labels: Readonly<{ today: string; tomorrow: string }>,
): string {
  if (!dayKey) return '';
  const nowMs = fmt.clock.nowMs();
  if (dayKey === fmt.dayKey(new Date(nowMs))) return labels.today;
  if (dayKey === fmt.dayKey(new Date(nowMs + DAY_MS))) return labels.tomorrow;
  return fmt.formatDate(`${dayKey}T00:00:00`);
}

/** A slot's start time in the admin-configured time format. */
export function slotTimeLabel(iso: string, fmt: SlotFormatter): string {
  return fmt.formatTime(iso);
}

/** '10:00 AM – 12:00 PM', or just the start when the slot has no end. */
export function slotRangeLabel(
  startIso: string,
  endIso: string | null | undefined,
  fmt: SlotFormatter,
): string {
  const start = fmt.formatTime(startIso);
  const end = endIso ? fmt.formatTime(endIso) : '';
  return end ? `${start} – ${end}` : start;
}

/**
 * Price for a tile. `freeLabel` is injected rather than hardcoded so the copy
 * stays translatable at the call site.
 */
export function slotPriceLabel(
  price: number | null | undefined,
  freeLabel: string,
  currencySymbol = '₹',
): string {
  if (!price || price <= 0) return freeLabel;
  return `${currencySymbol}${price.toLocaleString('en-IN')}`;
}
