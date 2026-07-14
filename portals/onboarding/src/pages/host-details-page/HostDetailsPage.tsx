import { useCallback } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
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
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import PodsTable from '../../components/pods-table/PodsTable';
import { PODS_TABLE, type PodRow } from '../../components/pods-table/queries';
import { useDateFormat } from '../../utils/dateFormat';
import { HOST_DETAILS } from '../hosts-page/queries';

const catPath = (c: { super_category_name: string; category_name: string; sub_category_name: string }) =>
  [c.super_category_name, c.category_name, c.sub_category_name].filter(Boolean).join(' › ');

export default function HostDetailsPage() {
  const { hostId = '' } = useParams<{ hostId: string }>();
  const navigate = useNavigate();
  const { formatDateTime } = useDateFormat();
  const client = useApolloClient();

  const { data, loading, error } = useQuery(HOST_DETAILS, {
    variables: { host_doc_id: hostId },
    fetchPolicy: 'cache-and-network',
    skip: !hostId,
  });
  const host = data?.host;
  const hostUserId = host?.user_id ?? '';

  const fetchPods = useCallback(
    async (q: TableQueryState) => {
      const filters = [...q.filters, { field: 'host_user_id', op: 'eq' as const, value: hostUserId }];
      const { data: podsData } = await client.query({
        query: PODS_TABLE,
        variables: tableQueryToGql({ ...q, filters }),
        fetchPolicy: 'network-only',
      });
      return { rows: podsData.podsTable.rows as PodRow[], total: podsData.podsTable.total as number };
    },
    [client, hostUserId],
  );

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

      <Stack spacing={1}>
        <Typography variant="subtitle1" fontWeight={800}>Pods</Typography>
        <PodsTable
          tableId="onboarding-host-pods"
          fetchRows={fetchPods}
          formatDateTime={formatDateTime}
          emptyText="No pods for this host yet."
        />
      </Stack>
    </Stack>
  );
}
