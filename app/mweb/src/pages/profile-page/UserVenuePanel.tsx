import { gql, useQuery } from '@apollo/client';
import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { Link as RouterLink } from 'react-router-dom';

const MY_VENUE = gql`
  query ProfileMyVenue {
    myVenue {
      id
      venue_name
      status
      step_completed
      reviewer_notes
      submitted_at
      approved_at
    }
  }
`;

export default function UserVenuePanel() {
  const { data, loading, error } = useQuery(MY_VENUE, { fetchPolicy: 'cache-and-network' });
  const venue = data?.myVenue;

  if (loading && !data) return <CircularProgress size={22} />;
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!venue) {
    return (
      <Stack spacing={1.5}>
        <Typography variant="body2" color="text.secondary">
          You have not registered a venue yet.
        </Typography>
        <Button component={RouterLink} to="/register-venue" variant="outlined" size="small">
          Register Venue
        </Button>
      </Stack>
    );
  }

  const completed = Math.min(venue.step_completed ?? 0, 4);
  const isApproved = venue.status === 'APPROVED';
  const labels = ['Details', 'Documents', 'Owner', 'Submit'];

  return (
    <Stack spacing={1.4}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box sx={{ width: 38, height: 38, borderRadius: 3, bgcolor: 'rgba(255,193,7,0.16)', color: 'warning.main', display: 'grid', placeItems: 'center' }}>
          <WorkspacePremiumIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 950 }} noWrap>
            {venue.venue_name || 'Venue application'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isApproved ? 'Approved venue profile' : `Step ${completed} of 4 completed`}
          </Typography>
        </Box>
        <Chip size="small" label={venue.status} color={isApproved ? 'success' : 'warning'} sx={{ fontWeight: 900 }} />
      </Stack>
      <Stack direction="row" spacing={0.75} alignItems="center">
        {labels.map((label, index) => {
          const done = index < completed || isApproved;
          return (
            <Box key={label} sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ height: 4, borderRadius: 99, bgcolor: done ? 'primary.main' : 'divider', mb: 0.6 }} />
              <Typography variant="caption" color={done ? 'primary.main' : 'text.secondary'} sx={{ fontSize: 10, fontWeight: 900 }} noWrap>
                {label}
              </Typography>
            </Box>
          );
        })}
      </Stack>
      {(venue.approved_at || venue.submitted_at) && (
        <Typography variant="caption" color="text.secondary">
          {venue.approved_at ? `Approved ${new Date(venue.approved_at).toLocaleDateString()}` : `Submitted ${new Date(venue.submitted_at).toLocaleDateString()}`}
        </Typography>
      )}
      {venue.reviewer_notes && <Alert severity="info">{venue.reviewer_notes}</Alert>}
      <Button component={RouterLink} to="/register-venue" variant="contained" size="large" sx={{ borderRadius: 999, fontWeight: 950 }}>
        {isApproved ? 'Update venue profile' : `Resume - step ${Math.min(completed + 1, 4)} of 4`}
      </Button>
    </Stack>
  );
}
