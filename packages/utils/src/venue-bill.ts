import { formatMoney } from './format-money';

/**
 * The venue's final bill at Complete Pod — one definition of the words and of
 * the summary lines, for every surface that shows them: the host's dialog on
 * mWeb and in the native app, the Admin console's dialog, and the Finance
 * Payment Release page that approves the result.
 *
 * The MONEY is the server's (`venueChargeForPod`). Nothing here adds two
 * numbers together: the lines only arrange figures the settlement returned, so
 * a preview can never disagree with what completion pays.
 *
 * Each key is a literal `t('…')` — `scripts/verify-translation-keys.mjs` greps
 * source for it. mWeb and native share `mweb.*`; every MUI portal shares
 * `shell.*`; the two are kept word-for-word identical.
 */
export type VenueBillTranslate = (
  key: string,
  options?: { count?: number; vars?: Record<string, string | number> },
) => string;

export interface VenueBillLabels {
  /** Heads the section in the completion dialog and on the Finance page. */
  title: string;
  amount: string;
  amountHint: string;
  amountInvalid: string;
  upload: string;
  uploadRequired: string;
  includeSlot: string;
  includeSlotHint: string;
  viewBill: string;
  attendees: string;
  attendeesValue: (attended: number, booked: number) => string;
  slotPrice: string;
  finalBill: string;
  noBill: string;
  venueTotal: string;
  venueTotalWithSlot: string;
  /** After submitting: the payouts wait on Finance. */
  sentToFinance: string;
}

/** `mweb.*` — mWeb and the native app. */
export function mwebVenueBillLabels(t: VenueBillTranslate): VenueBillLabels {
  return {
    title: t('mweb.venueBill.title'),
    amount: t('mweb.venueBill.amount'),
    amountHint: t('mweb.venueBill.amountHint'),
    amountInvalid: t('mweb.venueBill.amountInvalid'),
    upload: t('mweb.venueBill.upload'),
    uploadRequired: t('mweb.venueBill.uploadRequired'),
    includeSlot: t('mweb.venueBill.includeSlot'),
    includeSlotHint: t('mweb.venueBill.includeSlotHint'),
    viewBill: t('mweb.venueBill.viewBill'),
    attendees: t('mweb.venueBill.attendees'),
    attendeesValue: (attended, booked) =>
      t('mweb.venueBill.attendeesValue', { vars: { attended, booked } }),
    slotPrice: t('mweb.venueBill.slotPrice'),
    finalBill: t('mweb.venueBill.finalBill'),
    noBill: t('mweb.venueBill.noBill'),
    venueTotal: t('mweb.venueBill.venueTotal'),
    venueTotalWithSlot: t('mweb.venueBill.venueTotalWithSlot'),
    sentToFinance: t('mweb.venueBill.sentToFinance'),
  };
}

/** `shell.*` — every MUI portal. Word-for-word identical to `mweb.*` above. */
export function shellVenueBillLabels(t: VenueBillTranslate): VenueBillLabels {
  return {
    title: t('shell.venueBill.title'),
    amount: t('shell.venueBill.amount'),
    amountHint: t('shell.venueBill.amountHint'),
    amountInvalid: t('shell.venueBill.amountInvalid'),
    upload: t('shell.venueBill.upload'),
    uploadRequired: t('shell.venueBill.uploadRequired'),
    includeSlot: t('shell.venueBill.includeSlot'),
    includeSlotHint: t('shell.venueBill.includeSlotHint'),
    viewBill: t('shell.venueBill.viewBill'),
    attendees: t('shell.venueBill.attendees'),
    attendeesValue: (attended, booked) =>
      t('shell.venueBill.attendeesValue', { vars: { attended, booked } }),
    slotPrice: t('shell.venueBill.slotPrice'),
    finalBill: t('shell.venueBill.finalBill'),
    noBill: t('shell.venueBill.noBill'),
    venueTotal: t('shell.venueBill.venueTotal'),
    venueTotalWithSlot: t('shell.venueBill.venueTotalWithSlot'),
    sentToFinance: t('shell.venueBill.sentToFinance'),
  };
}

/** The figures the summary arranges — all of them the server's. */
export interface VenueBillTerms {
  /** The slot's booked price. 0 without a slot. */
  slot_price: number;
  /** The final bill entered at completion. 0 when none was. */
  bill: number;
  /** True when the bill is paid on top of the slot price. */
  slot_included: boolean;
  /** What the venue's side of the settlement comes to (waterfall.venue_amount). */
  venue_amount: number;
  attended_seats: number;
  booked_seats: number;
}

export interface VenueBillLine {
  key: 'attendees' | 'slot-price' | 'final-bill' | 'venue-total';
  label: string;
  value: string;
  /** The line the others add up to. */
  strong?: boolean;
}

/**
 * The summary under the bill fields: who came, what the slot was booked at,
 * the bill that was entered, and what the venue's side now comes to.
 *
 * The slot-price line is left out when there is no slot price to state — a
 * legacy pod with no slot link, or a snapshot from before it was recorded —
 * because "₹0" there would read as a free venue.
 */
export function buildVenueBillLines(
  terms: VenueBillTerms,
  labels: VenueBillLabels,
  symbol: string,
): VenueBillLine[] {
  const money = (n: number) => formatMoney(n, { symbol, decimals: 2, grouping: false });
  const lines: VenueBillLine[] = [
    {
      key: 'attendees',
      label: labels.attendees,
      value: labels.attendeesValue(terms.attended_seats, terms.booked_seats),
    },
  ];
  if (terms.slot_price > 0) {
    lines.push({ key: 'slot-price', label: labels.slotPrice, value: money(terms.slot_price) });
  }
  lines.push(
    {
      key: 'final-bill',
      label: labels.finalBill,
      value: terms.bill > 0 ? money(terms.bill) : labels.noBill,
    },
    {
      key: 'venue-total',
      label: terms.slot_included ? labels.venueTotalWithSlot : labels.venueTotal,
      value: money(terms.venue_amount),
      strong: true,
    },
  );
  return lines;
}

/** The first URL of a media picker's newline-separated value — a bill is one file. */
export function firstMediaUrl(text: string | null | undefined): string {
  return (
    String(text ?? '')
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean) ?? ''
  );
}
