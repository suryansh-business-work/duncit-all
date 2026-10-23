import { Chip } from '@mui/material';
import { venueOfferStatusKey } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  podId: string;
  /** `Pod.venue_offer_status`: COUNTERED while the venue's counter waits for the host. */
  status?: string | null;
}

/** "Venue countered" on a pod waiting for its venue, once the venue answered
 * the host's offer with its own terms — the pending page has Accept / Reject.
 * Nothing in any other state (the approval chip already says "pending"). */
export default function VenueCounteredChip({ podId, status }: Readonly<Props>) {
  const { t } = useTranslation();
  if (status !== 'COUNTERED') return null;
  return (
    <Chip
      data-testid={`host-pod-countered-${podId}`}
      label={t(venueOfferStatusKey(status))}
      color="info"
      sx={{ mt: 0.5, height: 24 }}
    />
  );
}
