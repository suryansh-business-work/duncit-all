import { Card, Link, Stack, Typography } from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import type { CreatePodVenue } from './create-pod.types';

/** Venue partner contact details, shared with the host for slot follow-up. */
export default function VenueContactCard({ venue }: Readonly<{ venue: CreatePodVenue }>) {
  return (
    <Card variant="outlined" sx={{ p: 1.5, borderRadius: 2 }} data-testid="create-pod-venue-contact">
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <SupportAgentIcon color="primary" fontSize="small" sx={{ mt: 0.25 }} />
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={800}>
            Venue contact for follow-up
          </Typography>
          <Typography variant="body2" fontWeight={800}>
            {venue.owner_name || venue.venue_name}
          </Typography>
          {venue.owner_phone && (
            <Link href={`tel:${venue.owner_phone}`} variant="body2">
              {venue.owner_phone}
            </Link>
          )}
          {venue.owner_email && (
            <Link href={`mailto:${venue.owner_email}`} variant="body2" sx={{ wordBreak: 'break-all' }}>
              {venue.owner_email}
            </Link>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
