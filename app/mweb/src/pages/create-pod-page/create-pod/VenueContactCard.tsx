import { Card, Link, Stack, Typography } from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import DirectionsIcon from '@mui/icons-material/Directions';
import { DuncitButton } from '@duncit/buttons';
import { mapSearchUrl } from '../../../utils/mapEmbed';
import { useTranslation } from '../../../i18n/useTranslation';
import type { CreatePodVenue } from './create-pod.types';

/** Venue partner card — address, a Call Venue / Get Directions action row and
 * the contact shared with the host for slot follow-up. */
export default function VenueContactCard({ venue }: Readonly<{ venue: CreatePodVenue }>) {
  const { t } = useTranslation();
  const address = [venue.address_line1, venue.locality, venue.city, venue.state, venue.postal_code]
    .filter(Boolean)
    .join(', ');
  const directions = mapSearchUrl([venue.venue_name, address].filter(Boolean).join(', '));

  return (
    <Card sx={{ p: 2 }} data-testid="create-pod-venue-contact">
      <Typography sx={{ fontSize: '1rem', fontWeight: 600 }}>{venue.venue_name}</Typography>
      {address && (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mt: 0.25
          }}>{address}</Typography>
      )}
      <Stack direction="row" sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
        {venue.owner_phone && (
          <DuncitButton href={`tel:${venue.owner_phone}`} variant="outlined" size="small" startIcon={<PhoneIcon fontSize="small" />} sx={{ minHeight: 36 }}>
            {t('mweb.createPod.callVenue')}
          </DuncitButton>
        )}
        <DuncitButton href={directions} target="_blank" rel="noreferrer" variant="outlined" size="small" startIcon={<DirectionsIcon fontSize="small" />} sx={{ minHeight: 36 }}>
          {t('mweb.createPod.getDirections')}
        </DuncitButton>
      </Stack>
      <Stack spacing={0.25} sx={{ mt: 1.5 }}>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 600
          }}>
          {t('mweb.createPod.venueContact')}
        </Typography>
        <Typography variant="body2" sx={{
          fontWeight: 600
        }}>{venue.owner_name || venue.venue_name}</Typography>
        {venue.owner_email && (
          <Link href={`mailto:${venue.owner_email}`} variant="body2" sx={{ wordBreak: 'break-all' }}>
            {venue.owner_email}
          </Link>
        )}
      </Stack>
    </Card>
  );
}
