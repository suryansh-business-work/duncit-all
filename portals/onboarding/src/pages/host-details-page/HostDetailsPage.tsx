import { useApolloClient, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Chip, Divider, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { BackHeader, QueryGuard } from '@duncit/ui';
import PodsTable from '../../components/pods-table/PodsTable';
import { PODS_TABLE, type PodRow } from '../../components/pods-table/queries';
import { useDateFormat } from '@duncit/app-settings';
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

  const fetchPods = useApolloTableFetch<PodRow>(
    client,
    PODS_TABLE,
    'podsTable',
    { extraFilters: [{ field: 'host_user_id', op: 'eq', value: hostUserId }] },
    [hostUserId],
  );

  return (
    <QueryGuard
      loading={loading && !data}
      error={error}
      errorText={error?.message}
      notFound={!host}
      notFoundText="Host not found."
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() => (
        <Stack spacing={2.5}>
          <BackHeader
            onBack={() => navigate('/hosts')}
            backAriaLabel="Back to hosts"
            backSx={{ bgcolor: 'action.hover' }}
            eyebrow="Host"
            title={host.full_name || 'Unnamed host'}
            titleWeight={950}
            titleSx={{ lineHeight: 1.1 }}
          />

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
      )}
    </QueryGuard>
  );
}
