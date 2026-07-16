import { useApolloClient } from '@apollo/client';
import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { format } from 'date-fns';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { formatINR } from '@duncit/utils';
import { MY_HOST_PODS_TABLE, type PartnerPodRow } from '../pods-page/queries';

function podStatusLabel(pod: PartnerPodRow) {
  if (pod.completed_at) return 'Completed';
  return pod.is_active ? 'Active' : 'Inactive';
}

function podStatusColor(pod: PartnerPodRow): 'success' | 'info' | 'default' {
  if (pod.completed_at) return 'success';
  return pod.is_active ? 'info' : 'default';
}

function formatDate(value?: string | null) {
  return value ? format(new Date(value), 'dd MMM yyyy, h:mm a') : 'Not scheduled';
}

const getPodRowId = (pod: PartnerPodRow) => pod.id;

const renderStatus = (pod: PartnerPodRow) => (
  <Chip size="small" label={podStatusLabel(pod)} color={podStatusColor(pod)} />
);

const earningValue = (pod: PartnerPodRow) =>
  formatINR(Number(pod.pod_amount ?? 0) * (pod.pod_attendees?.length ?? 0));

const COLUMNS: DuncitColumn<PartnerPodRow>[] = [
  {
    field: 'pod_title',
    headerName: 'Pod',
    flex: 1,
    minWidth: 200,
    valueGetter: (pod) => pod.pod_title,
  },
  {
    field: 'pod_date_time',
    headerName: 'Date',
    filter: { type: 'date' },
    minWidth: 175,
    valueGetter: (pod) => formatDate(pod.pod_date_time),
  },
  {
    field: 'attendees',
    headerName: 'Attendees',
    sortable: false,
    width: 110,
    valueGetter: (pod) => pod.pod_attendees?.length ?? 0,
  },
  { field: 'earning', headerName: 'Pod earning', sortable: false, width: 130, valueGetter: earningValue },
  {
    field: 'pod_amount',
    headerName: 'Amount',
    filter: { type: 'number' },
    hide: true,
    width: 110,
    valueGetter: (pod) => pod.pod_amount ?? 0,
  },
  {
    field: 'is_active',
    headerName: 'Status',
    filter: { type: 'boolean' },
    width: 120,
    cellRenderer: renderStatus,
    valueGetter: podStatusLabel,
  },
];

export default function HostPodsList() {
  const client = useApolloClient();

  const fetchRows = useApolloTableFetch<PartnerPodRow>(client, MY_HOST_PODS_TABLE, 'myHostPodsTable');

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={1.25}>
          <Typography variant="h6" fontWeight={950}>Your hosted pods</Typography>
          <Typography variant="body2" color="text.secondary">Pods assigned to your host profile appear here.</Typography>
          <DuncitTable<PartnerPodRow>
            tableId="partners-app-host-pods"
            columns={COLUMNS}
            fetchRows={fetchRows}
            getRowId={getPodRowId}
            emptyText="No hosted pods yet."
            defaultSort={{ field: 'pod_date_time', dir: 'desc' }}
            searchPlaceholder="Search pod title or ID"
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
