/**
 * The HTML the `campaign-calculator` widget draws: price rows, placement chips
 * and the rate table it fills when a build shipped that table empty.
 */

export interface RateEntry {
  position: string;
  label: string;
  note?: string | null;
  price_per_day: number;
}

export interface RateCard {
  currency_symbol: string;
  min_days: number;
  max_days: number;
  entries: RateEntry[];
}

export type Money = (value: number) => string;

/** One placement's line in the total: its rate, and that rate over the days. */
export const priceRow = (entry: RateEntry, days: number, money: Money, perDaySuffix: string): string =>
  `<div class="flex items-baseline justify-between gap-3"><dt class="text-ink-soft">${entry.label} · ${money(entry.price_per_day)}${perDaySuffix}</dt><dd class="font-semibold text-ink">${money(entry.price_per_day * days)}</dd></div>`;

/** A placement chip; `on` decides whether it starts ticked. */
export const placementChip = (entry: RateEntry, on: boolean, money: Money, perDaySuffix: string): string => {
  const checked = on ? ' checked' : '';
  return `<label class="placement-chip cursor-pointer"><input type="checkbox" name="placement" value="${entry.position}"${checked} class="sr-only"><span class="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-soft transition">${entry.label}<span class="text-xs font-bold opacity-70">${money(entry.price_per_day)}${perDaySuffix}</span></span></label>`;
};

/** A rate-table row; `notes` are the bundled descriptions keyed by position. */
export const rateRow = (entry: RateEntry, notes: Record<string, string>, money: Money): string =>
  `<tr class="border-t border-line"><th scope="row" class="px-5 py-4 font-head text-sm font-extrabold text-ink">${entry.label}</th><td class="hidden px-5 py-4 text-sm text-ink-soft sm:table-cell">${entry.note || notes[entry.position] || ''}</td><td class="px-5 py-4 text-right font-head text-sm font-extrabold text-primary">${money(entry.price_per_day)}</td></tr>`;

/** The bundled placement descriptions (`<script type="application/json"
 * data-placement-notes>`). A malformed blob costs a description, never the price. */
export function placementNotes(): Record<string, string> {
  const tag = document.querySelector('[data-placement-notes]');
  try {
    return JSON.parse(tag?.textContent ?? '{}');
  } catch {
    return {};
  }
}
