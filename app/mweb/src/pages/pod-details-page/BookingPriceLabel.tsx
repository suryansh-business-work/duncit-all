import { smartIncentiveFor, ticketDiscountFor } from '@duncit/utils';
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
 * picked with the multi-ticket tier and then any unlocked Smart Incentive
 * already taken off — priced exactly as checkout will, so the bar never
 * promises more than the bill — and names each discount underneath once it
 * applies. Native twin: the details booking bar.
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
  const ticket = ticketDiscountFor(Number(pod.pod_amount) || 0, seats, pod);
  // The two pod discounts compound: the offer comes off what the tier leaves.
  const incentive = smartIncentiveFor(ticket.net, offer?.unlocked ? offer.pct : 0);
  const notes = [
    ticket.pct > 0 ? t('mweb.podDetails.ticketDiscountApplied', { vars: { pct: ticket.pct, count: seats } }) : null,
    incentive.pct > 0 ? t('mweb.smartIncentive.unlockedNote', { vars: { pct: incentive.pct } }) : null,
  ].filter((note) => note !== null);
  return (
    <BarLabel
      caption={t('mweb.podDetails.price')}
      value={priceFormat(incentive.net)}
      emphasis="price"
      valueTestId="pod-price"
      note={notes.length > 0 ? notes.join(' · ') : null}
      noteTestId={incentive.pct > 0 ? 'pod-smart-incentive-applied' : 'pod-ticket-discount-applied'}
    />
  );
}
