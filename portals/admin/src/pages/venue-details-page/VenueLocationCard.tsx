import { Stack } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import { InfoRow } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import SectionCard from './SectionCard';
import { EMPTY, locationLine, orDash, streetAddress } from './venue-values';
import type { AdminVenueDetail } from './queries';

/** Where the venue is, as the owner filed it. Read-only: the address is edited
 * in the Onboarding portal, and a mismatch here is what an admin acts on. */
export default function VenueLocationCard({ venue }: Readonly<{ venue: AdminVenueDetail }>) {
  const { t } = useTranslation();
  const pin =
    typeof venue.lat === 'number' && typeof venue.lng === 'number'
      ? `${venue.lat}, ${venue.lng}`
      : EMPTY;

  return (
    <SectionCard icon={<PlaceIcon color="primary" />} title={t('admin.venueDetails.location')}>
      <Stack spacing={1.5}>
        <InfoRow label={t('admin.venueDetails.address')} value={streetAddress(venue) || EMPTY} />
        <InfoRow
          label={t('admin.venueDetails.location')}
          value={locationLine(venue) || t('admin.venueDetails.locationUnset')}
        />
        <InfoRow label={t('admin.venueDetails.postalCode')} value={orDash(venue.postal_code)} />
        <InfoRow label={t('admin.venueDetails.coordinates')} value={pin} />
      </Stack>
    </SectionCard>
  );
}
