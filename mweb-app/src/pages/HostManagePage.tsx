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
import UserHostPanel from './profile-page/UserHostPanel';

const HOST_PODS = gql`
  query MyHostedPods($host_user_id: ID!) {
    pods(filter: { host_user_id: $host_user_id, is_active: true }) {
      id
      pod_title
      pod_id
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

  return (
    <Stack spacing={3} sx={{ maxWidth: 720, mx: 'auto', width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <DashboardIcon color="primary" />
        <Typography variant="h5" fontWeight={800}>
          Hosts Management
        </Typography>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1" fontWeight={700}>
              Your host profile
            </Typography>
            <UserHostPanel />
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <EventIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
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
                  to={`/pods/${p.id}`}
                  sx={{
                    display: 'block',
                    p: 1.25,
                    borderRadius: 1.5,
                    border: 1,
                    borderColor: 'divider',
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
            <Button component={RouterLink} to="/become-host" variant="outlined" size="small">
              Edit host profile
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
