import type { PodChangeRow } from '@duncit/utils';

import { WindowOfferForm, type WindowOffer } from '@/forms/window-offer';
import type { OfferQuoteAnswer } from '@/hooks/useQuoteRequest';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  row: PodChangeRow;
  venueId: string;
  busy: boolean;
  priceOf: (requestId: string, window: WindowOffer) => Promise<OfferQuoteAnswer>;
  onClose: () => void;
  onApprove: (window: WindowOffer) => void;
}

/**
 * A venue taking over a pod answers with the time it hosts it and the price
 * it charges — on its own calendar, priced by the server for the pod's guests
 * with Duncit's commission on top. The booking is made the moment it approves.
 * mWeb twin: the venue approve dialog in `@duncit/pod-change-requests`.
 */
export function VenueTakeoverSheet({
  row,
  venueId,
  busy,
  priceOf,
  onClose,
  onApprove,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <WindowOfferForm
      testID="change-request-venue-takeover"
      venueId={venueId}
      title={t('windowOffer.changeTitle')}
      subtitle={[row.pod.pod_title, t('windowOffer.changeHint')].join(' · ')}
      submitLabel={t('windowOffer.approve')}
      busy={busy}
      priceOf={(window) => priceOf(row.id, window)}
      onClose={onClose}
      onSubmit={onApprove}
    />
  );
}
