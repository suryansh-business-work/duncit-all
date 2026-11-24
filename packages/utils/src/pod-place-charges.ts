/**
 * Place charges: what a venue bills at its own door (entry, table, cover…),
 * listed on a pod by its host. The member pays them straight to the venue —
 * they are never part of a Duncit payment — so both apps ask the member to
 * accept them before Join / Book, and let them flag charges that look wrong.
 */

export interface PodPlaceCharge {
  label: string;
  amount: number;
  note?: string | null;
}

/** What the listed charges add up to; a missing or non-numeric amount counts as 0. */
export function placeChargesTotal(charges: readonly PodPlaceCharge[] | null | undefined): number {
  return (charges ?? []).reduce((sum, charge) => sum + (Number(charge.amount) || 0), 0);
}

export interface PlaceChargesTicketContext {
  podId: string;
  podTitle: string;
  charges: readonly PodPlaceCharge[];
  /** The admin's currency symbol, as the member saw the amounts. */
  currencySymbol: string;
}

/**
 * The support ticket one tap on "Report to support" opens. Written here rather
 * than in each app so an agent reads the same facts whichever app the member
 * was on: the pod, and every charge exactly as it was shown to them.
 */
export function placeChargesTicketDraft(context: PlaceChargesTicketContext): {
  subject: string;
  body_text: string;
  category: 'BOOKING';
  pod_id: string;
  pod_title: string;
} {
  const money = (amount: number) => `${context.currencySymbol}${amount}`;
  // "- Entry: ₹200 (Includes one drink)" — a blank note adds nothing.
  const rows = context.charges.map((charge) => {
    const note = charge.note?.trim();
    return [`- ${charge.label}:`, money(Number(charge.amount) || 0), note ? `(${note})` : '']
      .filter(Boolean)
      .join(' ');
  });
  const lines = [
    'A member flagged the place charges on this pod as wrong or not relevant, from the confirmation shown before joining.',
    '',
    `Pod: ${context.podTitle}`,
    `Pod id: ${context.podId}`,
    '',
    'Place charges shown to the member (payable directly at the venue):',
    ...rows,
    `Total: ${money(placeChargesTotal(context.charges))}`,
    '',
    'Raised in one tap from the place charges confirmation.',
  ];
  return {
    subject: `Place charges look wrong — ${context.podTitle}`,
    body_text: lines.join('\n'),
    category: 'BOOKING',
    pod_id: context.podId,
    pod_title: context.podTitle,
  };
}
