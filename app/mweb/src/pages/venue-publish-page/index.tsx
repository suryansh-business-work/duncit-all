import { useQuery } from '@apollo/client/react';
import { Alert } from '@mui/material';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import { PublishPageCard } from '@duncit/public-page';
import { useSelectedVenue } from '../../hooks/useSelectedVenue';
import { useTranslation } from '../../i18n/useTranslation';
import VenuePageFrame from '../venue-manage-page/VenuePageFrame';
import { MY_VENUES_SWITCHER } from '../venue-manage-page/queries';

/**
 * Venue Options → Publish Your Venue: the venue's public page, link, QR code
 * and poster — the same Publish card Venue Studio shows — for the selected
 * venue. Only an approved venue can be published, so any other says why.
 */
export default function VenuePublishPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(MY_VENUES_SWITCHER, { fetchPolicy: 'cache-and-network' });
  const venues = data?.myVenues ?? [];
  const { venue, selectVenue } = useSelectedVenue(venues);

  return (
    <VenuePageFrame
      icon={<PublicRoundedIcon fontSize="small" />}
      title={t('mweb.studioOptions.publishVenue')}
      venues={venues}
      venue={venue}
      onSelect={selectVenue}
      loading={loading && !data}
      error={error}
      noVenuesMessage={t('mweb.studioOptions.noVenuesYet')}
    >
      {venue?.status === 'APPROVED' ? (
        <PublishPageCard kind="VENUE" refId={venue.id} title={venue.venue_name ?? ''} />
      ) : (
        <Alert severity="info" data-testid="venue-publish-needs-approval">
          {t('mweb.studioOptions.publishNeedsApproval')}
        </Alert>
      )}
    </VenuePageFrame>
  );
}
