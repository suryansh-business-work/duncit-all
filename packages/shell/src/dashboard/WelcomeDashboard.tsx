import type { ReactNode } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { AppIcon } from '../chrome/AppIcon';
import type { AppModule } from '../types';
import { AccountSummaryCard } from './AccountSummaryCard';

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

type ModulesGridProps = Readonly<{ name: string; modules: readonly AppModule[] }>;

function ModulesGrid({ name, modules }: ModulesGridProps) {
  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        {name} modules
      </Typography>
      <Grid container spacing={2}>
        {modules.map((module) => (
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
  );
}

export type WelcomeDashboardProps = Readonly<{
  /** Portal short name (`appConfig.name`) — heads the modules grid ("HR modules"). */
  name: string;
  /** Sub-header line under the greeting (`appConfig.tagline`). */
  tagline: string;
  /**
   * "Coming soon" module cards (`appConfig.modules`). When provided (even `[]`)
   * the "{name} modules" grid renders after the account card — the
   * hr/employee/ads-portal layout.
   */
  modules?: readonly AppModule[];
  /**
   * Custom body rendered between the greeting header and the account card, which
   * then moves last — the finance layout (its KPI "overview" section goes here).
   */
  children?: ReactNode;
}>;

/**
 * The `me`-query welcome dashboard (greeting + role chips + account card)
 * previously duplicated as `pages/DashboardPage.tsx` across five portals.
 */
export function WelcomeDashboard({ name, tagline, modules, children }: WelcomeDashboardProps) {
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
          {tagline}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap', gap: 1 }}>
          {(me?.roles ?? []).map((role: string) => (
            <Chip key={role} label={role.replaceAll('_', ' ')} color="primary" variant="outlined" size="small" />
          ))}
        </Stack>
      </Box>

      {children}

      <AccountSummaryCard user={me} />

      {modules ? <ModulesGrid name={name} modules={modules} /> : null}
    </Stack>
  );
}
