import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PlaceIcon from '@mui/icons-material/Place';

export interface ExploreVenue {
  id: string;
  venue_name: string;
  venue_type?: string | null;
  capacity?: number | null;
  cover_image_url?: string | null;
  city?: string | null;
  locality?: string | null;
  pod_count?: number | null;
}

/** Venue row on the Venues discovery page — cover, name, type/capacity,
 * location and live pod count. Native twin: hosts-venues/VenueCard. */
export default function VenueExploreCard({
  venue,
  onOpen,
}: Readonly<{ venue: ExploreVenue; onOpen: () => void }>) {
  const location = [venue.locality, venue.city].filter(Boolean).join(' · ');
  const meta = [
    venue.venue_type,
    venue.capacity ? `${venue.capacity} capacity` : null,
    venue.pod_count ? `${venue.pod_count} pods` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
      <CardActionArea onClick={onOpen} aria-label={venue.venue_name} data-testid={`venue-card-${venue.id}`}>
        <Box
          sx={{
            height: 120,
            bgcolor: 'primary.main',
            display: 'grid',
            placeItems: 'center',
            color: 'primary.contrastText',
          }}
        >
          {venue.cover_image_url ? (
            <Box
              component="img"
              src={venue.cover_image_url}
              alt={venue.venue_name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <StorefrontIcon sx={{ fontSize: 34 }} />
          )}
        </Box>
        <Stack spacing={0.25} sx={{ p: 1.5 }}>
          <Typography fontWeight={900} noWrap>
            {venue.venue_name}
          </Typography>
          {meta && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {meta}
            </Typography>
          )}
          {location && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PlaceIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" noWrap>
                {location}
              </Typography>
            </Stack>
          )}
        </Stack>
      </CardActionArea>
    </Card>
  );
}
