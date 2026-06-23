import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import type { AdminVenueDetails } from './queries';

const STATUS_COLOR: Record<AdminVenueDetails['status'], 'default' | 'info' | 'success' | 'error' | 'warning'> = {
  DRAFT: 'warning',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
};

// Presentational venue summary (image, status, location, owner). Lives in its
// own component so the Apollo detail page stays thin and this stays unit-tested.
export default function VenueOverviewCard({ venue }: Readonly<{ venue: AdminVenueDetails }>) {
  const locationLine = [venue.locality, venue.city, venue.state, venue.country].filter(Boolean).join(', ');
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
          <Box
            component="img"
            src={venue.cover_image_url || '/duncit-logo.svg'}
            alt={venue.venue_name}
            sx={{ width: 140, height: 140, borderRadius: 2, objectFit: 'cover', bgcolor: 'action.hover', flex: '0 0 auto' }}
          />
          <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip size="small" color={STATUS_COLOR[venue.status]} label={venue.status} sx={{ fontWeight: 800 }} />
              {venue.venue_type && <Chip size="small" variant="outlined" label={venue.venue_type} />}
              {typeof venue.capacity === 'number' && venue.capacity > 0 && (
                <Chip size="small" variant="outlined" label={`Capacity ${venue.capacity}`} />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {locationLine || 'Location not set'}
              {venue.postal_code ? ` · ${venue.postal_code}` : ''}
            </Typography>
            {venue.address_line1 && (
              <Typography variant="caption" color="text.secondary">
                {venue.address_line1}
              </Typography>
            )}
            {venue.description && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {venue.description}
              </Typography>
            )}
            <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={0.5} sx={{ mt: 0.5 }}>
              {venue.tags?.map((tag) => (
                <Chip key={tag} size="small" variant="outlined" label={tag} />
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Owner: {venue.owner_name || '—'}
              {venue.owner_phone ? ` · ${venue.owner_phone}` : ''}
              {venue.owner_email ? ` · ${venue.owner_email}` : ''}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
