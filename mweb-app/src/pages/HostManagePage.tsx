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
import EventIcon from '@mui/icons-material/Event';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddIcon from '@mui/icons-material/Add';
import UserHostPanel from './profile-page/UserHostPanel';

const HOST_PODS = gql`
  query MyHostedPods($host_user_id: ID!) {
    pods(filter: { host_user_id: $host_user_id, is_active: true }) {
      id
      pod_title
      pod_id
      club_slug
      pod_date_time
      pod_amount
      pod_type
      no_of_spots
      location_id
      zone_name
    }
  }
`;

const ME_QUERY = gql`
  query MeForHostManage {
    me {
      user_id
      full_name
    }
  }
`;

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export default function HostManagePage() {
  const meQ = useQuery(ME_QUERY, { fetchPolicy: 'cache-and-network' });
  const userId = meQ.data?.me?.user_id;
  const { data, loading, error } = useQuery(HOST_PODS, {
    variables: { host_user_id: userId },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });
  const pods = data?.pods ?? [];
  const upcomingPods = pods.filter((p: any) => p.pod_date_time && new Date(p.pod_date_time).getTime() > Date.now()).length;
  const paidPods = pods.filter((p: any) => !p.pod_type?.includes('FREE')).length;

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Box sx={{ width: 38, height: 38, borderRadius: 3, display: 'grid', placeItems: 'center', color: 'primary.contrastText', background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)' }}>
          <DashboardIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1 }}>
            Host Studio
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            Manage your profile and hosted pods
          </Typography>
        </Box>
        <Button component={RouterLink} to="/become-host" variant="contained" size="small" startIcon={<AddIcon />} sx={{ borderRadius: 999, fontWeight: 950 }}>
          Profile
        </Button>
      </Stack>

      <Stack direction="row" spacing={1}>
        {[{ label: 'Pods', value: pods.length }, { label: 'Upcoming', value: upcomingPods }, { label: 'Paid', value: paidPods }].map((item) => (
          <Card key={item.label} variant="outlined" sx={{ flex: 1, borderRadius: 3 }}>
            <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 950 }} noWrap>{item.label}</Typography>
              <Typography variant="h6" sx={{ mt: 0.35, fontWeight: 950 }}>{item.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Card variant="outlined" sx={{ borderRadius: 4, bgcolor: 'rgba(255,79,115,0.10)' }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
              Your host profile
            </Typography>
            <UserHostPanel />
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 4 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <EventIcon color="primary" />
            <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 950 }}>
              Your pods
            </Typography>
            <Chip size="small" label={pods.length} />
          </Stack>
          <Divider sx={{ mb: 1.5 }} />

          {loading && !data ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={22} />
            </Stack>
          ) : error ? (
            <Alert severity="error">{error.message}</Alert>
          ) : pods.length === 0 ? (
            <Alert severity="info">
              You don't host any pods yet. New pods you host will show up here.
            </Alert>
          ) : (
            <Stack spacing={1}>
              {pods.map((p: any) => (
                <Box
                  key={p.id}
                  component={RouterLink}
                  to={p.club_slug && p.pod_id ? `/club/${p.club_slug}/pod/${p.pod_id}` : '#'}
                  sx={{
                    display: 'block',
                    p: 1.25,
                    borderRadius: 3,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'all 160ms ease',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>
                        {p.pod_title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {formatDate(p.pod_date_time)}
                        {p.zone_name ? ` · ${p.zone_name}` : ''}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={p.pod_type?.replace(/_/g, ' ')}
                      color={p.pod_type?.includes('FREE') ? 'success' : 'primary'}
                      variant="outlined"
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}

          <Stack direction="row" sx={{ mt: 2 }}>
            <Button component={RouterLink} to="/become-host" variant="outlined" size="small" sx={{ borderRadius: 999, fontWeight: 900 }}>
              Edit host profile
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
