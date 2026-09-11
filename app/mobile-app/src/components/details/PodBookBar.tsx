import { BarCta, BarLabel } from '@/components/details/BarLabel';
import { SeatPicker } from '@/components/details/SeatPicker';
import { useTranslation } from '@/hooks/useTranslation';

export interface PodBookBarProps {
  isFree: boolean;
  isFull: boolean;
  podAmount: number;
  seats: number;
  maxSeats: number;
  onSeatsChange: (seats: number) => void;
  onCheckout: () => void;
}

/** Not-yet-booked state: price + seat picker + a Join/Book button (disabled when
 * the pod is full). The price shown is the ticket × seats. */
export function PodBookBar({
  isFree,
  isFull,
  podAmount,
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
  const priceValue = isFree ? t('mweb.podDetails.free') : `₹${podAmount * seats}`;
  return (
    <>
      <BarLabel caption={priceCaption} value={priceValue} emphasis="price" />
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
