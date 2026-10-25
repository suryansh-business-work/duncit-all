import { Text } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { HostOfferActions } from '@/components/venue-offer/HostOfferActions';
import { OfferNoticeText } from '@/components/venue-offer/OfferNoticeText';
import { OfferTermsPanel } from '@/components/venue-offer/OfferTermsPanel';
import { usePodVenueOffer } from '@/hooks/usePodVenueOffer';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  podId: string;
  /** Named in the accept's confirmation, with the venue. */
  podTitle: string;
  venueName: string;
  /** A free pod settles the venue off the platform: no amount is quoted. */
  podIsFree: boolean;
  /** Re-reads the screen once the host answers (the pod goes live or venue-declined). */
  onAnswered: () => unknown;
}

/**
 * The host's offer to the venue: the terms on the table — theirs, or the
 * venue's counter — where it stands, what it costs the pod and what the venue
 * receives from its minimum guests to the pod's spots, what the venue is asked
 * to provide, the notes, until when it may be answered, and — while the
 * venue's counter waits on the host — Accept, Reject or Counter back. Nothing
 * for a pod with no live offer. mWeb twin: VenueOfferCard.
 */
export function VenueOfferCard({
  podId,
  podTitle,
  venueName,
  podIsFree,
  onAnswered,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { offer, host } = usePodVenueOffer(podId, onAnswered);
  if (!offer) return null;

  return (
    <SurfaceCard testID="venue-offer-card" gap={12}>
      <Text role="heading" fontSize={16} fontWeight="600" color="$color">
        {t('mweb.venueOffer.title')}
      </Text>
      <OfferTermsPanel offer={offer} podIsFree={podIsFree} side="HOST" />
      <HostOfferActions
        podId={podId}
        offer={offer}
        podTitle={podTitle}
        venueName={venueName}
        answers={host}
      />
      <OfferNoticeText
        notice={host.notice}
        onDismiss={host.clearNotice}
        testID="venue-offer-notice"
      />
    </SurfaceCard>
  );
}
