import { smartIncentiveFor } from '@duncit/utils';

import { BarCta, BarLabel } from '@/components/details/BarLabel';
import { SeatPicker } from '@/components/details/SeatPicker';
import { useTranslation } from '@/hooks/useTranslation';

export interface PodBookBarProps {
  isFree: boolean;
  isFull: boolean;
  podAmount: number;
  /** The member's unlocked Smart Incentive %; 0 (or absent) when they hold none. */
  smartIncentivePct?: number;
  seats: number;
  maxSeats: number;
  onSeatsChange: (seats: number) => void;
  onCheckout: () => void;
}

/** Not-yet-booked state: price + seat picker + a Join/Book button (disabled when
 * the pod is full). The price shown is the ticket × seats less the member's
 * unlocked Smart Incentive — the same figure checkout starts from. mWeb twin:
 * BookingPriceLabel. */
export function PodBookBar({
  isFree,
  isFull,
  podAmount,
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
  // The offer comes off the full ticket gross (pod_amount × seats), as checkout takes it.
  const incentive = smartIncentiveFor(podAmount * seats, smartIncentivePct);
  const priceValue = isFree ? t('mweb.podDetails.free') : `₹${incentive.net}`;
  const note =
    !isFree && incentive.pct > 0
      ? t('mweb.smartIncentive.unlockedNote', { vars: { pct: incentive.pct } })
      : null;
  return (
    <>
      <BarLabel
        caption={priceCaption}
        value={priceValue}
        emphasis="price"
        note={note}
        noteTestID="pod-smart-incentive-applied"
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
