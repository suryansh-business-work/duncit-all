import { useMemo } from 'react';
import { Chip } from '@mui/material';
import type { DuncitColumn } from '@duncit/table';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import EntityPodsTab from '../../shared/EntityPodsTab';
import { HOST_PODS_TABLE, type HostPodRow } from '../queries';

/**
 * Every pod this host runs — `host_user_id` is an allowlisted `podsTable`
 * filter, so this is the shared pods engine rather than a query of its own.
 *
 * Note it filters on the host's USER id, not the host record's id: a pod names
 * its hosts by account, which is also why deactivating a host record does not
 * take their pods with it.
 */
const EMPTY = '—';

const whenValue = (p: HostPodRow) => (p.pod_date_time ? formatDateTime(p.pod_date_time) : EMPTY);

const seatsValue = (p: HostPodRow) => `${p.no_of_spots - p.seats_available}/${p.no_of_spots}`;

const renderMode = (p: HostPodRow) => <Chip size="small" variant="outlined" label={p.pod_mode} />;

const renderApproval = (p: HostPodRow) => <Chip size="small" label={p.venue_approval_status} />;

export default function HostPodsTab({ userId }: Readonly<{ userId: string }>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<HostPodRow>[]>(
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
        field: 'pod_mode',
        headerName: t('directory.hostEditor.colMode'),
        width: 130,
        cellRenderer: renderMode,
        valueGetter: (p) => p.pod_mode,
      },
      {
        field: 'no_of_spots',
        headerName: t('directory.hostEditor.colSeats'),
        width: 110,
        valueGetter: seatsValue,
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
    <EntityPodsTab<HostPodRow>
      filterField="host_user_id"
      filterValue={userId}
      document={HOST_PODS_TABLE}
      columns={columns}
      tableId="hosts-console-pods"
      title={t('directory.hostEditor.podsTitle')}
      subtitle={t('directory.hostEditor.podsSubtitle')}
      emptyText={t('directory.hostEditor.podsEmpty')}
    />
  );
}
