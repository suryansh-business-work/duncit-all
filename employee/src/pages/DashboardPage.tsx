import { gql, useQuery } from '@apollo/client';
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { appConfig } from '../config/app-config';
import { parseApiError } from '../utils/parseApiError';
import AppIcon from '../components/AppIcon';
import AccountSummary from './dashboard/AccountSummary';

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

      <AccountSummary user={me} />

      <Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
          {appConfig.name} modules
        </Typography>
        <Grid container spacing={2}>
          {appConfig.modules.map((module) => (
            <Grid key={module.title} item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={1}>
                    <Box sx={{ color: 'primary.main' }}>
                      <AppIcon name={module.icon} />
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {module.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {module.description}
                    </Typography>
                    <Chip label="Coming soon" size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Stack>
  );
}
