import { FOOD_ORDER_LIMITS } from './venue-food';

/**
 * A cafe's tables and their QR stickers (rules 27/40) — the owner lists the
 * tables, the server prints one sticker per table, and each sticker's QR opens
 * the menu with `?table=<label>` so the guest's checkout starts with the table
 * filled in. One contract for the owner's editors (Partners, Venues console,
 * mWeb studio, native desk) and the guest's checkout (mWeb + native).
 */

/** The query parameter a table sticker's QR carries. The server's FOOD_TABLE_PARAM mirrors it. */
export const FOOD_TABLE_PARAM = 'table';

/**
 * The table a guest's link names, cleaned for the checkout's table field: the
 * first value, trimmed, cut to the field's own limit. '' when there is none.
 */
export function foodTableFromParam(raw: unknown): string {
  const value: unknown = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' ? value.trim().slice(0, FOOD_ORDER_LIMITS.tableMax) : '';
}

/**
 * The owner's typed table list ("1, 2, Patio") as labels: split on commas and
 * new lines, trimmed, blanks dropped, repeats (ignoring case) kept once.
 */
export function parseFoodTables(text: string): string[] {
  const seen = new Set<string>();
  const tables: string[] = [];
  for (const part of text.split('\n').join(',').split(',')) {
    const label = part.trim();
    const key = label.toLowerCase();
    if (label && !seen.has(key)) {
      seen.add(key);
      tables.push(label);
    }
  }
  return tables;
}

/** The labels as the owner's field shows them. */
export const foodTablesText = (tables: readonly string[] | null | undefined): string => (tables ?? []).join(', ');

/** "Number of tables: 12" as the field text "1, 2, …, 12" — the quick way to list a numbered floor. */
export function foodTablesFromCount(count: number, limit: number): string {
  const total = Math.min(Math.max(0, Math.floor(count)), limit);
  return foodTablesText(Array.from({ length: total }, (_, index) => String(index + 1)));
}

/** A table label longer than the checkout field holds — the form refuses it. */
export const isFoodTableTooLong = (label: string): boolean => label.length > FOOD_ORDER_LIMITS.tableMax;

/** Every table's QR sticker in one PDF (owner, or a Venues console editor). */
export const VENUE_TABLE_STICKERS_QUERY = /* GraphQL */ `
  query MyVenueTableStickers($venueId: ID!, $headline: String!, $tableHeading: String!) {
    myVenueTableStickersPdfBase64(venue_id: $venueId, headline: $headline, table_heading: $tableHeading)
  }
`;
