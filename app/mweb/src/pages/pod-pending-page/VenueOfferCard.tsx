import { Card, Stack, Typography } from '@mui/material';
import { HostOfferActions, OfferTermsPanel, usePodVenueOffer } from '@duncit/availability-calendar';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  podId: string;
  /** Named in the accept's confirmation, with the venue. */
  podTitle: string;
  venueName: string;
  /** A free pod settles the venue off the platform: no amount is quoted. */
  podIsFree: boolean;
  /** Re-reads the page once the host answers (the pod goes live or venue-declined). */
  onAnswered: () => Promise<unknown>;
}

/**
 * The host's offer to the venue: the terms on the table — theirs, or the
 * venue's counter — where it stands, what it costs the pod and what the venue
 * receives from its minimum guests to the pod's spots, what the venue is asked
 * to provide, the notes, until when it may be answered, and — while the
 * venue's counter waits on the host — Accept, Reject or Counter back (a free
 * pod or a free venue is only accepted or declined). Nothing for a pod with no
 * live offer. Native twin: VenueOfferCard.
 */
export default function VenueOfferCard({ podId, podTitle, venueName, podIsFree, onAnswered }: Readonly<Props>) {
  const { t } = useTranslation();
  const { offer, refetch } = usePodVenueOffer(podId);
  if (!offer) return null;

  const answered = () => Promise.all([refetch(), onAnswered()]);
  // The page's pod type, or the offer's own record that the pod was free when it was made.
  const free = podIsFree || !!offer.free_pod;

  return (
    <Card variant="outlined" sx={{ p: 2 }} data-testid="venue-offer-card">
      <Stack spacing={1.5}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
          {t('mweb.venueOffer.title')}
        </Typography>
        <OfferTermsPanel offer={offer} podIsFree={free} side="HOST" />
        <HostOfferActions
          offer={offer}
          subject={{ pod_id: podId, pod_title: podTitle, venue_name: venueName }}
          podIsFree={free}
          onDone={answered}
        />
      </Stack>
    </Card>
  );
}
