import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useApolloClient } from '@apollo/client/react';
import { Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { VENUE_PODS_TABLE, type VenuePodRow } from './queries';
import { EMPTY } from './venue-values';

const getPodRowId = (p: VenuePodRow) => p.id;

const whenValue = (p: VenuePodRow) => (p.pod_date_time ? formatDateTime(p.pod_date_time) : EMPTY);

const hostsValue = (p: VenuePodRow) => p.host_names?.join(', ') || EMPTY;

const renderApproval = (p: VenuePodRow) => <Chip size="small" label={p.venue_approval_status} />;

/** Every pod booked at this venue, straight off the shared pods table engine —
 * `venue_id` is one of its allowlisted filters, so no second query exists for
 * this list. A row opens the pod's own details page. */
export default function VenuePodsTab({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useApolloClient();

  const fetchRows = useApolloTableFetch<VenuePodRow>(
    client,
    VENUE_PODS_TABLE,
    'podsTable',
    { extraFilters: [{ field: 'venue_id', op: 'eq', value: venueId }] },
    [venueId],
  );

  const columns = useMemo<DuncitColumn<VenuePodRow>[]>(
    () => [
      {
        field: 'pod_title',
        headerName: t('admin.venueDetails.colPod'),
        flex: 1,
        minWidth: 200,
        valueGetter: (p) => p.pod_title,
      },
      {
        field: 'pod_date_time',
        headerName: t('admin.venueDetails.colWhen'),
        minWidth: 170,
        filter: { type: 'date' },
        valueGetter: whenValue,
      },
      {
        field: 'host_names',
        headerName: t('admin.venueDetails.colHosts'),
        minWidth: 160,
        sortable: false,
        valueGetter: hostsValue,
      },
      {
        field: 'no_of_spots',
        headerName: t('admin.venueDetails.colSpots'),
        width: 95,
        valueGetter: (p) => p.no_of_spots ?? 0,
      },
      {
        field: 'venue_approval_status',
        headerName: t('admin.venueDetails.colApproval'),
        width: 150,
        cellRenderer: renderApproval,
        valueGetter: (p) => p.venue_approval_status,
      },
    ],
    [t],
  );

  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.25}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {t('admin.venueDetails.podsTitle')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('admin.venueDetails.podsSubtitle')}
        </Typography>
      </Stack>

      <DuncitTable<VenuePodRow>
        tableId="admin-venue-pods"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getPodRowId}
        emptyText={t('admin.venueDetails.podsEmpty')}
        defaultSort={{ field: 'pod_date_time', dir: 'desc' }}
        onRowClick={(pod) => navigate(`/pods/${pod.id}`)}
      />
    </Stack>
  );
}
