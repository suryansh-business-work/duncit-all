import { smartIncentiveFor } from '@duncit/utils';
import { BarLabel } from './BarLabel';
import { useTranslation } from '../../i18n/useTranslation';
import type { SmartIncentiveOffer } from './useSmartIncentiveOffer';

interface Props {
  pod: any;
  isFree: boolean;
  /** Seats the picker holds — the price is for all of them. */
  seats: number;
  priceFormat: (n: number) => string;
  /** The member's Smart Incentive on this pod; only an unlocked one is taken off. */
  offer?: SmartIncentiveOffer | null;
}

/**
 * The booking bar's price. A paid pod shows the ticket money for the seats
 * picked with any unlocked Smart Incentive already taken off — priced exactly
 * as checkout will, so the bar never promises more than the bill — and names
 * the discount underneath once it applies. Native twin: the details booking bar.
 */
export default function BookingPriceLabel({ pod, isFree, seats, priceFormat, offer = null }: Readonly<Props>) {
  const { t } = useTranslation();
  if (isFree) {
    return (
      <BarLabel
        caption={t('mweb.podDetails.entry')}
        value={t('mweb.podDetails.free')}
        emphasis="price"
        valueTestId="pod-price"
      />
    );
  }
  // The offer comes off the full ticket gross (pod_amount × seats).
  const incentive = smartIncentiveFor((Number(pod.pod_amount) || 0) * seats, offer?.unlocked ? offer.pct : 0);
  return (
    <BarLabel
      caption={t('mweb.podDetails.price')}
      value={priceFormat(incentive.net)}
      emphasis="price"
      valueTestId="pod-price"
      note={incentive.pct > 0 ? t('mweb.smartIncentive.unlockedNote', { vars: { pct: incentive.pct } }) : null}
      noteTestId="pod-smart-incentive-applied"
    />
  );
}
