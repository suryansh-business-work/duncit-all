import { Card, CardActionArea, Stack, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import { venueImages } from '@duncit/utils';
import VenueCardMedia from './VenueCardMedia';

export interface ExploreVenue {
  id: string;
  venue_name: string;
  venue_type?: string | null;
  capacity?: number | null;
  cover_image_url?: string | null;
  gallery?: string[] | null;
  city?: string | null;
  locality?: string | null;
  pod_count?: number | null;
}

/** Venue row on the Venues discovery page — an image slider over every photo
 * the venue has, then name, type/capacity, location and live pod count. Native
 * twin: hosts-venues/VenueCard. */
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
    <Card sx={{ p: 1 }}>
      {/* The slider owns its own taps (arrows must not navigate), so it sits
          outside the action area rather than inside it. */}
      <VenueCardMedia images={venueImages(venue)} venueName={venue.venue_name} onOpen={onOpen} />
      {/* The name block paints its own opaque surface under the photo's own
          18px corners, so a busy photo never reads through into the text.
          Native twin does the same. */}
      <CardActionArea onClick={onOpen} aria-label={venue.venue_name} data-testid={`venue-card-${venue.id}`} sx={{ borderRadius: '16px' }}>
        <Stack
          spacing={0.25}
          sx={{
            px: 1,
            pt: 1.25,
            pb: 0.75,
            position: 'relative',
            bgcolor: 'background.paper',
          }}
        >
          <Typography
            noWrap
            sx={{
              fontSize: '1rem',
              fontWeight: 600,
              color: "text.primary"
            }}>
            {venue.venue_name}
          </Typography>
          {meta && (
            <Typography variant="caption" noWrap sx={{
              color: "text.secondary"
            }}>
              {meta}
            </Typography>
          )}
          {location && (
            <Stack direction="row" spacing={0.5} sx={{
              alignItems: "center"
            }}>
              <PlaceIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption" noWrap sx={{
                color: "text.secondary"
              }}>
                {location}
              </Typography>
            </Stack>
          )}
        </Stack>
      </CardActionArea>
    </Card>
  );
}
