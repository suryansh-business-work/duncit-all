import { ticketDiscountFor } from '@duncit/utils';
import { BarLabel } from './BarLabel';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  pod: any;
  isFree: boolean;
  /** Seats the picker holds — the price is for all of them. */
  seats: number;
  priceFormat: (n: number) => string;
}

/**
 * The booking bar's price. A paid pod shows the ticket money for the seats
 * picked with the multi-ticket tier already taken off — priced exactly as
 * checkout will, so the bar never promises more than the bill — and names the
 * tier underneath once one applies. Native twin: the details booking bar.
 */
export default function BookingPriceLabel({ pod, isFree, seats, priceFormat }: Readonly<Props>) {
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
  const note =
    ticket.pct > 0
      ? t('mweb.podDetails.ticketDiscountApplied', { vars: { pct: ticket.pct, count: seats } })
      : null;
  return (
    <BarLabel
      caption={t('mweb.podDetails.price')}
      value={priceFormat(ticket.net)}
      emphasis="price"
      valueTestId="pod-price"
      note={note}
      noteTestId="pod-ticket-discount-applied"
    />
  );
}
