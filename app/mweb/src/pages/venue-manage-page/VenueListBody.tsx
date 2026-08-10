import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { venueUrl } from '../../utils/seoUrls';

interface VenueListBodyProps {
  showSpinner: boolean;
  error?: { message: string };
  venue: any;
}

/** The "Your venues" card body — spinner, error, the register prompt, or the
 * owner's single listed venue. */
export default function VenueListBody({ showSpinner, error, venue }: Readonly<VenueListBodyProps>) {
  if (showSpinner) {
    return (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  }
  if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }
  if (!venue) {
    return (
      <Alert severity="info">
        You haven't registered a venue yet.
        <Box sx={{ mt: 1.5 }}>
          <Button component={RouterLink} to="/register-venue" variant="contained" size="small">
            Register a venue
          </Button>
        </Box>
      </Alert>
    );
  }
  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: '16px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" spacing={1.25}>
        <Box component="img" src={venue.cover_image_url || '/new-duncit-logo.png'} alt={venue.venue_name} sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '16px', bgcolor: 'action.hover', flex: '0 0 auto' }} />
        <Stack spacing={0.35} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700 }} noWrap>
            {venue.venue_name}
          </Typography>
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
          <Typography variant="body2" sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} color="text.primary">
            {venue.description}
          </Typography>
        )}
        </Stack>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
        <Button component={RouterLink} to="/register-venue" variant="outlined" size="small" startIcon={<EditIcon />} sx={{ flex: 1, borderRadius: 999, fontWeight: 700 }}>
          Edit
        </Button>
        {venue?.status === 'APPROVED' && (
          <Button component={RouterLink} to={venueUrl(venue.id)} variant="contained" size="small" endIcon={<OpenInNewIcon fontSize="small" />} sx={{ flex: 1, borderRadius: 999, fontWeight: 700 }}>
            Public link
          </Button>
        )}
      </Stack>
    </Box>
  );
}
