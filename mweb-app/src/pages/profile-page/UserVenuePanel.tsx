import { gql, useQuery } from '@apollo/client';
import { Alert, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
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

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle2">{venue.venue_name || 'Venue application'}</Typography>
        <Chip size="small" label={venue.status} color={venue.status === 'APPROVED' ? 'success' : 'default'} />
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Step {venue.step_completed}/4
        {venue.approved_at ? ` · Approved ${new Date(venue.approved_at).toLocaleDateString()}` : ''}
        {!venue.approved_at && venue.submitted_at ? ` · Submitted ${new Date(venue.submitted_at).toLocaleDateString()}` : ''}
      </Typography>
      {venue.reviewer_notes && <Alert severity="info">{venue.reviewer_notes}</Alert>}
      <Button component={RouterLink} to="/register-venue" variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }}>
        Open Venue Profile
      </Button>
    </Stack>
  );
}
