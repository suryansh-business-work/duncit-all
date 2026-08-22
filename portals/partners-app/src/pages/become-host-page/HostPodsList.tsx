import { useApolloClient } from '@apollo/client';
import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { formatINR, payingAttendees } from '@duncit/utils';
import { MY_HOST_PODS_TABLE, type PartnerPodRow } from '../pods-page/queries';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

function podStatusLabel(pod: PartnerPodRow) {
  if (pod.completed_at) return 'Completed';
  return pod.is_active ? 'Active' : 'Inactive';
}

function podStatusColor(pod: PartnerPodRow): 'success' | 'info' | 'default' {
  if (pod.completed_at) return 'success';
  return pod.is_active ? 'info' : 'default';
}

function formatDate(value?: string | null) {
  return formatDateTime(value) || 'Not scheduled';
}

const getPodRowId = (pod: PartnerPodRow) => pod.id;

const renderStatus = (pod: PartnerPodRow) => (
  <Chip size="small" label={podStatusLabel(pod)} color={podStatusColor(pod)} />
);

// Hosts sit in pod_attendees but never pay — drop them before earning math.
const earningValue = (pod: PartnerPodRow) =>
  formatINR(Number(pod.pod_amount ?? 0) * payingAttendees(pod.pod_attendees, pod.pod_hosts_id));

type Translate = ReturnType<typeof useTranslation>['t'];

const columns = (t: Translate): DuncitColumn<PartnerPodRow>[] =>[
  {
    field: 'pod_title',
    headerName: t('partners.common.pod'),
    flex: 1,
    minWidth: 200,
    valueGetter: (pod) => pod.pod_title,
  },
  {
    field: 'pod_date_time',
    headerName: t('partners.common.date'),
    filter: { type: 'date' },
    minWidth: 175,
    valueGetter: (pod) => formatDate(pod.pod_date_time),
  },
  {
    field: 'attendees',
    headerName: t('partners.common.attendees'),
    sortable: false,
    width: 110,
    valueGetter: (pod) => pod.pod_attendees?.length ?? 0,
  },
  { field: 'earning', headerName: t('partners.becomeHostPage.podEarning'), sortable: false, width: 130, valueGetter: earningValue },
  {
    field: 'pod_amount',
    headerName: t('partners.common.amount'),
    filter: { type: 'number' },
    hide: true,
    width: 110,
    valueGetter: (pod) => pod.pod_amount ?? 0,
  },
  {
    field: 'is_active',
    headerName: t('shell.common.status'),
    filter: { type: 'boolean' },
    width: 120,
    cellRenderer: renderStatus,
    valueGetter: podStatusLabel,
  },
];

export default function HostPodsList() {
  const { t } = useTranslation();
  const client = useApolloClient();

  const fetchRows = useApolloTableFetch<PartnerPodRow>(client, MY_HOST_PODS_TABLE, 'myHostPodsTable');

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={1.25}>
          <Typography variant="h6" fontWeight={950}>{t('partners.becomeHostPage.yourHostedPods')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('partners.becomeHostPage.podsAssignedToYourHostProfile')}</Typography>
          <DuncitTable<PartnerPodRow>
            tableId="partners-app-host-pods"
            columns={columns(t)}
            fetchRows={fetchRows}
            getRowId={getPodRowId}
            emptyText={t('partners.becomeHostPage.noHostedPodsYet')}
            defaultSort={{ field: 'pod_date_time', dir: 'desc' }}
            searchPlaceholder="Search pod title or ID"
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
