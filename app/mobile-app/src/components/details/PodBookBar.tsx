import { ticketDiscountFor, type TicketDiscountSource } from '@duncit/utils';

import { BarCta, BarLabel } from '@/components/details/BarLabel';
import { SeatPicker } from '@/components/details/SeatPicker';
import { useTranslation } from '@/hooks/useTranslation';

export interface PodBookBarProps {
  isFree: boolean;
  isFull: boolean;
  podAmount: number;
  /** The pod's multi-ticket discount — the price drops once the seats reach a tier. */
  ticketDiscount: TicketDiscountSource;
  seats: number;
  maxSeats: number;
  onSeatsChange: (seats: number) => void;
  onCheckout: () => void;
}

/** Not-yet-booked state: price + seat picker + a Join/Book button (disabled when
 * the pod is full). The price shown is the ticket × seats, less the multi-ticket
 * tier those seats reach — the same figure checkout starts from. */
export function PodBookBar({
  isFree,
  isFull,
  podAmount,
  ticketDiscount,
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
  const priceValue = isFree ? t('mweb.podDetails.free') : `₹${ticket.net}`;
  const discountNote =
    ticket.pct > 0 && !isFree
      ?t('mweb.podDetails.ticketDiscountApplied', { vars: { pct: ticket.pct, count: seats } })
      : null;
  return (
    <>
      <BarLabel
        caption={priceCaption}
        value={priceValue}
        emphasis="price"
        note={discountNote}
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
