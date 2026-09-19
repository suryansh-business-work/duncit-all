import { formatInTimeZone } from 'date-fns-tz';
import { formatMoney } from '@duncit/utils';

/** Whole rupees, en-IN grouping: 1250 -> ₹1,250; 0 -> the free label the caller passes. */
export function priceLabel(rupees: number, freeLabel: string): string {
  return rupees > 0 ? formatMoney(rupees) : freeLabel;
}

/** The cheapest active ticket's label for a card. */
export function fromPriceLabel(tickets: readonly { price: number; is_active: boolean }[], freeLabel: string, fromLabel: (price: string) => string): string {
  const active = tickets.filter((t) => t.is_active);
  if (active.length === 0) return freeLabel;
  const min = Math.min(...active.map((t) => t.price));
  if (min === 0) return freeLabel;
  return active.length > 1 ? fromLabel(formatMoney(min)) : formatMoney(min);
}

/**
 * An event's times in ITS zone (the zone the host picked), not the reader's:
 * "Sat, 21 Sep · 7:00 PM – 9:30 PM (Asia/Kolkata)". The admin's display
 * pattern applies to the rest of the app; an event page shows the host's clock.
 */
export function eventWhen(startIso: string, endIso: string, timezone: string, datePattern = 'EEE, d MMM yyyy', timePattern = 'h:mm a'): { date: string; time: string; zone: string } {
  const zone = timezone || 'Asia/Kolkata';
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = formatInTimeZone(start, zone, 'yyyy-MM-dd') === formatInTimeZone(end, zone, 'yyyy-MM-dd');
  const endText = sameDay ? formatInTimeZone(end, zone, timePattern) : `${formatInTimeZone(end, zone, datePattern)} · ${formatInTimeZone(end, zone, timePattern)}`;
  return { date: formatInTimeZone(start, zone, datePattern), time: `${formatInTimeZone(start, zone, timePattern)} – ${endText}`, zone };
}

/** `yyyy-MM-dd` in the event's zone, for grouping a list by day. */
export const dayKeyIn = (iso: string, timezone: string): string => formatInTimeZone(new Date(iso), timezone || 'Asia/Kolkata', 'yyyy-MM-dd');

/** The reader's own IANA zone, for a new event's default. */
export const deviceTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
};
