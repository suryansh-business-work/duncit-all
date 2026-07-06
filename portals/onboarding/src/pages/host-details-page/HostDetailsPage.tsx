import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useDateFormat } from '../../utils/dateFormat';
import { podBucket } from '../../utils/podBucket';
import { HOST_DETAILS, HOST_PODS, type HostPod } from '../hosts-page/queries';
import HostPodsSection from './HostPodsSection';

const catPath = (c: { super_category_name: string; category_name: string; sub_category_name: string }) =>
  [c.super_category_name, c.category_name, c.sub_category_name].filter(Boolean).join(' › ');

export default function HostDetailsPage() {
  const { hostId = '' } = useParams<{ hostId: string }>();
  const navigate = useNavigate();
  const { formatDateTime } = useDateFormat();

  const { data, loading, error } = useQuery(HOST_DETAILS, {
    variables: { host_doc_id: hostId },
    fetchPolicy: 'cache-and-network',
    skip: !hostId,
  });
  const host = data?.host;

  const { data: podsData } = useQuery<{ pods: HostPod[] }>(HOST_PODS, {
    variables: { host_user_id: host?.user_id },
    fetchPolicy: 'cache-and-network',
    skip: !host?.user_id,
  });

  const buckets = useMemo(() => {
    const pods = podsData?.pods ?? [];
    return {
      upcoming: pods.filter((p) => podBucket(p) === 'upcoming'),
      ongoing: pods.filter((p) => podBucket(p) === 'ongoing'),
      hosted: pods.filter((p) => podBucket(p) === 'hosted'),
    };
  }, [podsData]);

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!host) return <Alert severity="warning">Host not found.</Alert>;

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton size="small" onClick={() => navigate('/hosts')} aria-label="Back to hosts" sx={{ bgcolor: 'action.hover' }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
            Host
          </Typography>
          <Typography variant="h5" fontWeight={950} sx={{ lineHeight: 1.1 }}>
            {host.full_name || 'Unnamed host'}
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip size="small" label={host.status} />
        <Chip size="small" variant="outlined" color={host.is_active === false ? 'default' : 'success'} label={host.is_active === false ? 'Inactive' : 'Active'} />
        {host.email && <Chip size="small" variant="outlined" label={host.email} />}
        {host.phone && <Chip size="small" variant="outlined" label={host.phone} />}
      </Stack>

      {(host.host_categories ?? []).length > 0 && (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {host.host_categories.map((c: any) => (
            <Chip key={c.request_no || catPath(c)} size="small" color="primary" variant="outlined" label={catPath(c) || '—'} />
          ))}
        </Stack>
      )}

      <Divider />

      <HostPodsSection title="Ongoing / current pods" emptyLabel="No pods running right now." pods={buckets.ongoing} formatDateTime={formatDateTime} />
      <HostPodsSection title="Upcoming pods" emptyLabel="No upcoming pods." pods={buckets.upcoming} formatDateTime={formatDateTime} />
      <HostPodsSection title="Hosted pods" emptyLabel="No pods hosted yet." pods={buckets.hosted} formatDateTime={formatDateTime} />
    </Stack>
  );
}
