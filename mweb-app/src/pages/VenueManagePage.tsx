import { Link as RouterLink } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import UserVenuePanel from './profile-page/UserVenuePanel';

const MY_VENUE_DETAILS = gql`
  query MyVenueDetails {
    myVenue {
      id
      venue_name
      venue_type
      capacity
      description
      cover_image_url
      country
      city
      state
      locality
      postal_code
      amenities
      tags
      status
      approved_at
    }
  }
`;

export default function VenueManagePage() {
  const { data, loading, error } = useQuery(MY_VENUE_DETAILS, {
    fetchPolicy: 'cache-and-network',
  });
  const venue = data?.myVenue;

  return (
    <Stack spacing={3} sx={{ maxWidth: 720, mx: 'auto', width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <StorefrontIcon color="primary" />
        <Typography variant="h5" fontWeight={800}>
          Venue Management
        </Typography>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1" fontWeight={700}>
              Your application
            </Typography>
            <UserVenuePanel />
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            Your venues
          </Typography>
          <Divider sx={{ mb: 1.5 }} />
          {loading && !data ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={22} />
            </Stack>
          ) : error ? (
            <Alert severity="error">{error.message}</Alert>
          ) : !venue ? (
            <Alert severity="info">
              You haven't registered a venue yet.
              <Box sx={{ mt: 1.5 }}>
                <Button
                  component={RouterLink}
                  to="/register-venue"
                  variant="contained"
                  size="small"
                >
                  Register a venue
                </Button>
              </Box>
            </Alert>
          ) : (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                display: 'flex',
                gap: 1.5,
              }}
            >
              <Box
                component="img"
                src={venue.cover_image_url || '/duncit-logo.svg'}
                alt={venue.venue_name}
                sx={{
                  width: 84,
                  height: 84,
                  objectFit: 'cover',
                  borderRadius: 1.5,
                  bgcolor: 'action.hover',
                  flex: '0 0 auto',
                }}
              />
              <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ flex: 1 }}>
                    {venue.venue_name}
                  </Typography>
                  <Chip
                    size="small"
                    label={venue.status}
                    color={venue.status === 'APPROVED' ? 'success' : 'default'}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {[venue.venue_type, venue.locality, venue.city, venue.state].filter(Boolean).join(' - ') || '-'}
                </Typography>
                {venue.postal_code && (
                  <Typography variant="caption" color="text.secondary">
                    PIN: {venue.postal_code}
                  </Typography>
                )}
                {venue.tags?.length > 0 && (
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                    {venue.tags.map((tag: string) => <Chip key={tag} size="small" label={tag} variant="outlined" />)}
                  </Stack>
                )}
                {typeof venue.capacity === 'number' && (
                  <Typography variant="caption" color="text.secondary">
                    Capacity: {venue.capacity}
                  </Typography>
                )}
                {venue.description && (
                  <Typography variant="body2" sx={{ mt: 0.5 }} color="text.primary">
                    {venue.description}
                  </Typography>
                )}
              </Stack>
            </Box>
          )}

          <Stack direction="row" sx={{ mt: 2 }} spacing={1}>
            <Button component={RouterLink} to="/register-venue" variant="outlined" size="small">
              Edit venue
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
