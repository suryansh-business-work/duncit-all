import { gql, useQuery } from '@apollo/client';
import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import PeopleIcon from '@mui/icons-material/People';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import StorefrontIcon from '@mui/icons-material/Storefront';

const StatCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'transform 120ms ease, box-shadow 120ms ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[2],
  },
}));

const IconWrap = styled(Box)(({ theme }) => ({
  width: 44,
  height: 44,
  borderRadius: theme.shape.borderRadius,
  display: 'grid',
  placeItems: 'center',
  backgroundColor: theme.palette.action.hover,
  color: theme.palette.primary.main,
}));

const USERS = gql`
  query DashboardUsers {
    users {
      user_id
      roles
      status
    }
  }
`;

export default function DashboardPage() {
  const { data, loading } = useQuery(USERS);
  const users: any[] = data?.users ?? [];

  const total = users.length;
  const admins = users.filter((u) =>
    u.roles?.some((r: string) => ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'].includes(r))
  ).length;
  const support = users.filter((u) => u.roles?.includes('SUPPORT_USER')).length;
  const venueOwners = users.filter((u) => u.roles?.includes('VENUE_OWNER')).length;

  const stats = [
    { label: 'Total Users', value: total, icon: <PeopleIcon /> },
    { label: 'Administrators', value: admins, icon: <VerifiedUserIcon /> },
    { label: 'Support Users', value: support, icon: <SupportAgentIcon /> },
    { label: 'Venue Owners', value: venueOwners, icon: <StorefrontIcon /> },
  ];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          Overview of platform activity.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {stats.map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <StatCard>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <IconWrap>{s.icon}</IconWrap>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {s.label}
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {loading ? '—' : s.value}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </StatCard>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}