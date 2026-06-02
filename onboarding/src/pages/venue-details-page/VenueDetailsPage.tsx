import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { VENUE_DETAILS, type AdminVenueDetails } from './queries';
import VenueHealthCard from './VenueHealthCard';

const STATUS_COLOR: Record<AdminVenueDetails['status'], 'default' | 'info' | 'success' | 'error' | 'warning'> = {
  DRAFT: 'warning',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
};

export default function VenueDetailsPage() {
  const { venueId = '' } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<{ venue: AdminVenueDetails | null }>(VENUE_DETAILS, {
    variables: { venue_doc_id: venueId },
    fetchPolicy: 'cache-and-network',
    skip: !venueId,
  });

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!data?.venue) return <Alert severity="warning">Venue not found.</Alert>;

  const venue = data.venue;
  const locationLine = [venue.locality, venue.city, venue.state, venue.country].filter(Boolean).join(', ');

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton size="small" onClick={() => navigate('/venues')} aria-label="Back to venues" sx={{ bgcolor: 'action.hover' }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
            Venue
          </Typography>
          <Typography variant="h5" fontWeight={950} sx={{ lineHeight: 1.1 }}>
            {venue.venue_name || 'Untitled venue'}
          </Typography>
        </Box>
      </Stack>

      <Card>
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

      <Stack>
        <Typography variant="h6" fontWeight={900}>
          Account Health
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5 }}>
          Default score is 100. Use the Adjust action to decrease or increase it with a remark —
          remarks are visible to the venue owner when they tap the meter.
        </Typography>
        <VenueHealthCard venueId={venue.id} />
      </Stack>
    </Stack>
  );
}
