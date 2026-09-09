import type { AdminVenueDetail } from './queries';

/** The placeholder every empty field on this page reads as. */
export const EMPTY = '—';

/** Joins the parts that are set, or '' when none are — the caller decides what
 * an empty line says, because only it has the translator. */
const join = (parts: Array<string | null | undefined>, sep = ', ') =>
  parts.map((p) => p?.trim()).filter(Boolean).join(sep);

/** Locality → city → state → country, skipping whatever the owner left blank. */
export const locationLine = (v: AdminVenueDetail) =>
  join([v.locality, v.city, v.state, v.country]);

/** The street address as its own line — the postal code rides in its own row. */
export const streetAddress = (v: AdminVenueDetail) => join([v.address_line1, v.address_line2]);

export const categoryPath = (c: AdminVenueDetail['venue_category']) =>
  join([c?.super_category_name, c?.category_name, c?.sub_category_name], ' > ') || EMPTY;

/** A value that may be blank, rendered as the dash rather than as nothing. */
export const orDash = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return EMPTY;
  const text = String(value).trim();
  return text === '' ? EMPTY : text;
};

/** The weekday names for the days the venue is closed, in week order.
 * `labels` comes from `weekdayLabels(t)` so the names stay localized. */
export const weeklyOffNames = (days: readonly number[], labels: readonly string[]) =>
  [...days].sort((a, b) => a - b).map((d) => labels[d]).filter(Boolean);

/** True when the owner has entered any payout destination at all. */
export const hasPayout = (bank: AdminVenueDetail['bank_account']) =>
  Boolean(bank?.account_number || bank?.upi_id || bank?.account_holder_name);
