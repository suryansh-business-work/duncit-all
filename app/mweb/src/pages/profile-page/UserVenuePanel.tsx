import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { DuncitButton } from '@duncit/buttons';
import { Link as RouterLink } from 'react-router';
import { formatDate } from '../../utils/dateFormat';
import IconDisc from '../account-page/IconDisc';

const MY_VENUE = gql`
  query ProfileMyVenue($venue_id: ID) {
    myVenue(venue_id: $venue_id) {
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

/**
 * The venue application card — its progress, the reviewer's note and the button
 * back into the form.
 *
 * `venueId` is how Venue Studio keeps this panel on the venue its switcher has
 * selected. Left out (the profile page), the server picks: the newest
 * application still in flight, else the newest venue.
 */
export default function UserVenuePanel({ venueId = null }: Readonly<{ venueId?: string | null }>) {
  const { data, loading, error } = useQuery<any>(MY_VENUE, {
    variables: { venue_id: venueId },
    fetchPolicy: 'cache-and-network',
  });
  const venue = data?.myVenue;

  if (loading && !data) return <CircularProgress size={22} />;
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!venue) {
    return (
      <Stack spacing={1.5}>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          You have not registered a venue yet.
        </Typography>
        <DuncitButton component={RouterLink} to="/register-venue" variant="outlined" size="small">
          Register Venue
        </DuncitButton>
      </Stack>
    );
  }

  const completed = Math.min(venue.step_completed ?? 0, 4);
  const isApproved = venue.status === 'APPROVED';
  const labels = ['Details', 'Documents', 'Owner', 'Submit'];

  return (
    <Stack spacing={1.4}>
      <Stack direction="row" spacing={1.25} sx={{
        alignItems: "center"
      }}>
        <IconDisc size={40}>
          <WorkspacePremiumIcon />
        </IconDisc>
        <Typography sx={{ minWidth: 0, flex: 1, fontSize: 15, fontWeight: 600 }} noWrap>
          {venue.venue_name || 'Venue application'}
        </Typography>
        <Chip size="small" label={venue.status} color={isApproved ? 'success' : 'warning'} />
      </Stack>
      <Stack direction="row" spacing={0.75} sx={{
        alignItems: "center"
      }}>
        {labels.map((label, index) => {
          const done = index < completed || isApproved;
          return (
            <Box key={label} sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ height: 4, borderRadius: 99, bgcolor: done ? 'primary.main' : 'action.hover', mb: 0.6 }} />
              <Typography variant="caption" color={done ? 'primary.main' : 'text.secondary'} sx={{ fontSize: 11, fontWeight: 600 }} noWrap>
                {label}
              </Typography>
            </Box>
          );
        })}
      </Stack>
      {(venue.approved_at || venue.submitted_at) && (
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {venue.approved_at ? `Approved ${formatDate(venue.approved_at)}` : `Submitted ${formatDate(venue.submitted_at)}`}
        </Typography>
      )}
      {venue.reviewer_notes && <Alert severity="info">{venue.reviewer_notes}</Alert>}
      <DuncitButton component={RouterLink} to="/register-venue" variant="contained" size="large">
        {isApproved ? 'Update venue profile' : `Resume - step ${Math.min(completed + 1, 4)} of 4`}
      </DuncitButton>
    </Stack>
  );
}
