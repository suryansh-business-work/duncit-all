import type { Translator } from '@duncit/i18n';
import { smartIncentiveFor, ticketDiscountFor, type TicketDiscountSource } from '@duncit/utils';

import { BarCta, BarLabel } from '@/components/details/BarLabel';
import { SeatPicker } from '@/components/details/SeatPicker';
import { useTranslation } from '@/hooks/useTranslation';

export interface PodBookBarProps {
  isFree: boolean;
  isFull: boolean;
  podAmount: number;
  /** The pod's multi-ticket discount — the price drops once the seats reach a tier. */
  ticketDiscount: TicketDiscountSource;
  /** The member's unlocked Smart Incentive %; 0 (or absent) when they hold none. */
  smartIncentivePct?: number;
  seats: number;
  maxSeats: number;
  onSeatsChange: (seats: number) => void;
  onCheckout: () => void;
}

/** What the price already has taken off — the tier the seats reach and the
 * member's unlocked offer, whichever apply; null when neither does. */
function discountNote(
  ticketPct: number,
  incentivePct: number,
  seats: number,
  t: Translator['t'],
): string | null {
  const notes = [
    ticketPct > 0
      ? t('mweb.podDetails.ticketDiscountApplied', { vars: { pct: ticketPct, count: seats } })
      : '',
    incentivePct > 0 ? t('mweb.smartIncentive.unlockedNote', { vars: { pct: incentivePct } }) : '',
  ].filter(Boolean);
  return notes.length > 0 ? notes.join(' · ') : null;
}

/** Not-yet-booked state: price + seat picker + a Join/Book button (disabled when
 * the pod is full). The price shown is the ticket × seats, less the multi-ticket
 * tier those seats reach and then the member's unlocked Smart Incentive — the
 * same figure checkout starts from. */
export function PodBookBar({
  isFree,
  isFull,
  podAmount,
  ticketDiscount,
  smartIncentivePct = 0,
  seats,
  maxSeats,
  onSeatsChange,
  onCheckout,
}: Readonly<PodBookBarProps>) {
  const { t } = useTranslation();
  const freeOrBookAria = isFree ? t('mweb.podDetails.joinPod') : t('mweb.podDetails.bookPod');
  const bookAriaLabel = isFull ? t('mweb.podDetails.podIsFull') : freeOrBookAria;
  const freeOrBookText = isFree ? t('mweb.podDetails.join') : t('mweb.podDetails.bookNow');
  const bookText = isFull ? t('mweb.podDetails.podIsFull') : freeOrBookText;
  const priceCaption = isFree ? t('mweb.podDetails.entry') : t('mweb.podDetails.price');
  const ticket = ticketDiscountFor(podAmount, seats, ticketDiscount);
  // Off what the tier left, as checkout takes it — the two compound, never add.
  const incentive = smartIncentiveFor(ticket.net, smartIncentivePct);
  const priceValue = isFree ? t('mweb.podDetails.free') : `₹${incentive.net}`;
  const note = isFree ? null : discountNote(ticket.pct, incentive.pct, seats, t);
  return (
    <>
      <BarLabel
        caption={priceCaption}
        value={priceValue}
        emphasis="price"
        note={note}
        noteTestID="pod-ticket-discount-applied"
      />
      <SeatPicker value={seats} onChange={onSeatsChange} maxSeats={maxSeats} disabled={isFull} />
      <BarCta
        testID="pod-book"
        label={bookText}
        ariaLabel={bookAriaLabel}
        disabled={isFull}
        onPress={onCheckout}
      />
    </>
  );
}
