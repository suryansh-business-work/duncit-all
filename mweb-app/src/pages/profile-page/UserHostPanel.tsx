import { gql, useQuery } from '@apollo/client';
import { Alert, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const MY_HOST = gql`
  query ProfileMyHost {
    myHost {
      id
      status
      step_completed
      reviewer_notes
      submitted_at
      approved_at
    }
  }
`;

export default function UserHostPanel() {
  const { data, loading, error } = useQuery(MY_HOST, { fetchPolicy: 'cache-and-network' });
  const host = data?.myHost;

  if (loading && !data) return <CircularProgress size={22} />;
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!host) {
    return (
      <Stack spacing={1.5}>
        <Typography variant="body2" color="text.secondary">
          You have not started a host profile yet.
        </Typography>
        <Button component={RouterLink} to="/become-host" variant="outlined" size="small">
          Become a Host
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle2">Host application</Typography>
        <Chip size="small" label={host.status} color={host.status === 'APPROVED' ? 'success' : 'default'} />
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Step {host.step_completed}/4
        {host.approved_at ? ` · Approved ${new Date(host.approved_at).toLocaleDateString()}` : ''}
        {!host.approved_at && host.submitted_at ? ` · Submitted ${new Date(host.submitted_at).toLocaleDateString()}` : ''}
      </Typography>
      {host.reviewer_notes && <Alert severity="info">{host.reviewer_notes}</Alert>}
      <Button component={RouterLink} to="/become-host" variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }}>
        Open Host Profile
      </Button>
    </Stack>
  );
}
