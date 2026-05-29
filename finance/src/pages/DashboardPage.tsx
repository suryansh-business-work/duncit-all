import { gql, useQuery } from '@apollo/client';
import { Alert, Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { appConfig } from '../config/app-config';
import { parseApiError } from '../utils/parseApiError';
import AccountSummary from './dashboard/AccountSummary';
import { FinanceKpis } from './finance/dashboard';

const DASHBOARD_ME = gql`
  query DashboardMe {
    me {
      user_id
      full_name
      first_name
      last_name
      email
      phone_number
      phone_extension
      roles
      created_at
    }
  }
`;

export default function DashboardPage() {
  const { data, loading, error } = useQuery(DASHBOARD_ME, { fetchPolicy: 'cache-and-network' });
  const me = data?.me;

  if (loading && !me) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{parseApiError(error)}</Alert>;
  }

  const firstName = me?.first_name || me?.full_name?.split(' ')[0] || 'there';

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" fontWeight={800}>
          Welcome back, {firstName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {appConfig.tagline}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap', gap: 1 }}>
          {(me?.roles ?? []).map((role: string) => (
            <Chip key={role} label={role.replace(/_/g, ' ')} color="primary" variant="outlined" size="small" />
          ))}
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          {appConfig.name} overview
        </Typography>
        <FinanceKpis />
      </Box>

      <AccountSummary user={me} />
    </Stack>
  );
}
