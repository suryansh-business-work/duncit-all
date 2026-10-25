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
  /** The total on the venue's final bill — proof of the agreed amount, required on a paid venue pod. */
  billTotal: string;
  billTotalHint: string;
  amountInvalid: string;
  /** A paid venue pod cannot complete without the bill's total. */
  billRequired: string;
  upload: string;
  billUploadRequired: string;
  /** Charges on the bill beyond the agreed amount, paid on top once Finance approves them. */
  extra: string;
  extraHint: string;
  extraInvalid: string;
  extraCharges: string;
  viewBill: string;
  attendees: string;
  attendeesValue: (attended: number, booked: number) => string;
  /** A per-guest booking: the guests the venue is paid for, never fewer than its minimum. */
  paidGuests: string;
  paidGuestsValue: (count: number, min: number) => string;
  slotPrice: string;
  finalBill: string;
  noBill: string;
  venueTotal: string;
  venueTotalWithSlot: string;
  /** After submitting: the payouts wait on Finance. */
  sentToFinance: string;
  /** The venue's usage at completion: guests charged for (a per-guest slot) and hours past the slot. */
  pax: string;
  paxHint: string;
  paxInvalid: string;
  overtimeHours: string;
  overtimeHint: string;
  overtimeInvalid: string;
}

/** `mweb.*` — mWeb and the native app. */
export function mwebVenueBillLabels(t: VenueBillTranslate): VenueBillLabels {
  return {
    title: t('mweb.venueBill.title'),
    billTotal: t('mweb.venueBill.billTotal'),
    billTotalHint: t('mweb.venueBill.billTotalHint'),
    amountInvalid: t('mweb.venueBill.amountInvalid'),
    billRequired: t('mweb.venueBill.billRequired'),
    upload: t('mweb.venueBill.upload'),
    billUploadRequired: t('mweb.venueBill.billUploadRequired'),
    extra: t('mweb.venueBill.extra'),
    extraHint: t('mweb.venueBill.extraHint'),
    extraInvalid: t('mweb.venueBill.extraInvalid'),
    extraCharges: t('mweb.venueBill.extraCharges'),
    viewBill: t('mweb.venueBill.viewBill'),
    attendees: t('mweb.venueBill.attendees'),
    attendeesValue: (attended, booked) =>
      t('mweb.venueBill.attendeesValue', { vars: { attended, booked } }),
    paidGuests: t('mweb.venueBill.paidGuests'),
    paidGuestsValue: (count, min) => t('mweb.venueBill.paidGuestsValue', { vars: { count, min } }),
    slotPrice: t('mweb.venueBill.slotPrice'),
    finalBill: t('mweb.venueBill.finalBill'),
    noBill: t('mweb.venueBill.noBill'),
    venueTotal: t('mweb.venueBill.venueTotal'),
    venueTotalWithSlot: t('mweb.venueBill.venueTotalWithSlot'),
    sentToFinance: t('mweb.venueBill.sentToFinance'),
    pax: t('mweb.venueBill.pax'),
    paxHint: t('mweb.venueBill.paxHint'),
    paxInvalid: t('mweb.venueBill.paxInvalid'),
    overtimeHours: t('mweb.venueBill.overtimeHours'),
    overtimeHint: t('mweb.venueBill.overtimeHint'),
    overtimeInvalid: t('mweb.venueBill.overtimeInvalid'),
  };
}

/** `shell.*` — every MUI portal. Word-for-word identical to `mweb.*` above. */
export function shellVenueBillLabels(t: VenueBillTranslate): VenueBillLabels {
  return {
    title: t('shell.venueBill.title'),
    billTotal: t('shell.venueBill.billTotal'),
    billTotalHint: t('shell.venueBill.billTotalHint'),
    amountInvalid: t('shell.venueBill.amountInvalid'),
    billRequired: t('shell.venueBill.billRequired'),
    upload: t('shell.venueBill.upload'),
    billUploadRequired: t('shell.venueBill.billUploadRequired'),
    extra: t('shell.venueBill.extra'),
    extraHint: t('shell.venueBill.extraHint'),
    extraInvalid: t('shell.venueBill.extraInvalid'),
    extraCharges: t('shell.venueBill.extraCharges'),
    viewBill: t('shell.venueBill.viewBill'),
    attendees: t('shell.venueBill.attendees'),
    attendeesValue: (attended, booked) =>
      t('shell.venueBill.attendeesValue', { vars: { attended, booked } }),
    paidGuests: t('shell.venueBill.paidGuests'),
    paidGuestsValue: (count, min) => t('shell.venueBill.paidGuestsValue', { vars: { count, min } }),
    slotPrice: t('shell.venueBill.slotPrice'),
    finalBill: t('shell.venueBill.finalBill'),
    noBill: t('shell.venueBill.noBill'),
    venueTotal: t('shell.venueBill.venueTotal'),
    venueTotalWithSlot: t('shell.venueBill.venueTotalWithSlot'),
    sentToFinance: t('shell.venueBill.sentToFinance'),
    pax: t('shell.venueBill.pax'),
    paxHint: t('shell.venueBill.paxHint'),
    paxInvalid: t('shell.venueBill.paxInvalid'),
    overtimeHours: t('shell.venueBill.overtimeHours'),
    overtimeHint: t('shell.venueBill.overtimeHint'),
    overtimeInvalid: t('shell.venueBill.overtimeInvalid'),
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
  /** Charges on the bill beyond the agreed amount, paid on top. 0 or absent when none. */
  extra?: number;
  /** A per-guest booking's agreed minimum guests. 0 or absent when it has none. */
  min_guests?: number;
  /** The guests the venue was paid for: max(people who came, the minimum). */
  people_counted?: number;
}

export interface VenueBillLine {
  key: 'attendees' | 'paid-guests' | 'slot-price' | 'final-bill' | 'extra' | 'venue-total';
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
  const minGuests = terms.min_guests ?? 0;
  if (minGuests > 0) {
    lines.push({
      key: 'paid-guests',
      label: labels.paidGuests,
      value: labels.paidGuestsValue(terms.people_counted ?? minGuests, minGuests),
    });
  }
  if (terms.slot_price > 0) {
    lines.push({ key: 'slot-price', label: labels.slotPrice, value: money(terms.slot_price) });
  }
  lines.push({
    key: 'final-bill',
    label: labels.finalBill,
    value: terms.bill > 0 ? money(terms.bill) : labels.noBill,
  });
  const extra = terms.extra ?? 0;
  if (extra > 0) lines.push({ key: 'extra', label: labels.extraCharges, value: money(extra) });
  lines.push({
    key: 'venue-total',
    label: terms.slot_included ? labels.venueTotalWithSlot : labels.venueTotal,
    value: money(terms.venue_amount),
    strong: true,
  });
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
