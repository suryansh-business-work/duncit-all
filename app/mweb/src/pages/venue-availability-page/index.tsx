import { useQuery } from '@apollo/client/react';
import { Alert } from '@mui/material';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import { VenuePricingModule } from '@duncit/availability-calendar';
import VenuePageFrame from '../venue-manage-page/VenuePageFrame';
import { MY_VENUES_AVAILABILITY, type AvailabilityVenue } from './queries';
import { useTranslation } from '../../i18n/useTranslation';
import { useSelectedVenue } from '../../hooks/useSelectedVenue';

interface EditorProps {
  venue: AvailabilityVenue;
  onVenueChanged: () => Promise<void>;
}

/** The pricing module, or the reason it is closed: hosts can only book an
 * approved venue, so an application still in flight has nothing to price. */
function AvailabilityEditor({ venue, onVenueChanged }: Readonly<EditorProps>) {
  const { t } = useTranslation();
  if (venue.status !== 'APPROVED') {
    return (
      <Alert severity="warning" data-testid="venue-availability-not-approved">
        {t('mweb.venueAvailabilityPage.approvalRequired', { vars: { status: venue.status } })}
      </Alert>
    );
  }
  return <VenuePricingModule key={venue.id} venue={venue} onVenueChanged={onVenueChanged} />;
}

/**
 * The Venue Pricing Module, for a venue owner on their phone (/venues/pricing;
 * the old /venues/availability lands here).
 *
 * The module itself is the shared one the Partners console mounts (rule 40);
 * this page only picks WHICH venue — through the same switcher Venue Studio
 * uses.
 */
export default function VenueAvailabilityPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ myVenues: AvailabilityVenue[] }>(
    MY_VENUES_AVAILABILITY,
    { fetchPolicy: 'cache-and-network' }
  );
  const venues = data?.myVenues ?? [];
  const { venue, selectVenue } = useSelectedVenue(venues);

  return (
    <VenuePageFrame
      icon={<SellRoundedIcon fontSize="small" />}
      title={t('venuePricing.page.title')}
      venues={venues}
      venue={venue}
      onSelect={selectVenue}
      loading={loading && !data}
      // A holiday writes the venue's settings, then this page re-reads them:
      // the calendar dims for that round trip instead of sitting there stale.
      refreshing={loading && !!data}
      error={error}
      noVenuesMessage={t('mweb.venueAvailabilityPage.noVenues')}
    >
      {venue && (
        <AvailabilityEditor
          venue={venue}
          onVenueChanged={async () => {
            await refetch();
          }}
        />
      )}
    </VenuePageFrame>
  );
}
