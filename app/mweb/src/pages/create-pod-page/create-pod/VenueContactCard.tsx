import { Button, Card, Link, Stack, Typography } from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import DirectionsIcon from '@mui/icons-material/Directions';
import { mapSearchUrl } from '../../../utils/mapEmbed';
import type { CreatePodVenue } from './create-pod.types';

/** Venue partner card — address, a Call Venue / Get Directions action row and
 * the contact shared with the host for slot follow-up. */
export default function VenueContactCard({ venue }: Readonly<{ venue: CreatePodVenue }>) {
  const address = [venue.address_line1, venue.locality, venue.city, venue.state, venue.postal_code]
    .filter(Boolean)
    .join(', ');
  const directions = mapSearchUrl([venue.venue_name, address].filter(Boolean).join(', '));

  return (
    <Card variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }} data-testid="create-pod-venue-contact">
      <Typography variant="subtitle2" fontWeight={900}>{venue.venue_name}</Typography>
      {address && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{address}</Typography>
      )}
      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
        {venue.owner_phone && (
          <Button href={`tel:${venue.owner_phone}`} size="small" startIcon={<PhoneIcon fontSize="small" />} sx={{ fontWeight: 800 }}>
            Call Venue
          </Button>
        )}
        <Button href={directions} target="_blank" rel="noreferrer" size="small" startIcon={<DirectionsIcon fontSize="small" />} sx={{ fontWeight: 800 }}>
          Get Directions
        </Button>
      </Stack>
      <Stack spacing={0.25} sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={800}>
          Venue contact for follow-up
        </Typography>
        <Typography variant="body2" fontWeight={800}>{venue.owner_name || venue.venue_name}</Typography>
        {venue.owner_email && (
          <Link href={`mailto:${venue.owner_email}`} variant="body2" sx={{ wordBreak: 'break-all' }}>
            {venue.owner_email}
          </Link>
        )}
      </Stack>
    </Card>
  );
}
