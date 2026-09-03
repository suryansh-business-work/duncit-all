import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert } from '@mui/material';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import { VenueAvailabilityEditor } from '@duncit/availability-calendar';
import { pickVenue } from '@duncit/utils';
import VenuePageFrame from '../venue-manage-page/VenuePageFrame';
import { MY_VENUES_AVAILABILITY, type AvailabilityVenue } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

interface EditorProps {
  venue: AvailabilityVenue;
  onVenueChanged: () => Promise<void>;
}

/** The calendar, or the reason it is closed: hosts can only book slots at an
 * approved venue, so an application still in flight has nothing to publish. */
function AvailabilityEditor({ venue, onVenueChanged }: Readonly<EditorProps>) {
  const { t } = useTranslation();
  if (venue.status !== 'APPROVED') {
    return (
      <Alert severity="warning">
        {t('mweb.venueAvailabilityPage.approvalRequired', { vars: { status: venue.status } })}
      </Alert>
    );
  }
  return <VenueAvailabilityEditor venue={venue} onVenueChanged={onVenueChanged} />;
}

/**
 * Availability Calendar, for a venue owner on their phone.
 *
 * The calendar itself is the shared editor the Partners console mounts (rule
 * 40); this page only picks WHICH venue — through the same switcher Venue
 * Studio uses. Native twin: VenueAvailabilityScreen (rule 27).
 */
export default function VenueAvailabilityPage() {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, loading, error, refetch } = useQuery<{ myVenues: AvailabilityVenue[] }>(
    MY_VENUES_AVAILABILITY,
    { fetchPolicy: 'cache-and-network' }
  );
  const venues = data?.myVenues ?? [];
  const venue = pickVenue(venues, selectedId);

  return (
    <VenuePageFrame
      icon={<EventRepeatIcon fontSize="small" />}
      title={t('mweb.venueAvailabilityPage.title')}
      caption={t('mweb.venueAvailabilityPage.subtitle')}
      venues={venues}
      venue={venue}
      onSelect={setSelectedId}
      loading={loading && !data}
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
