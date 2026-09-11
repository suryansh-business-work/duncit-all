import { useMemo } from 'react';
import { Chip } from '@mui/material';
import { type DuncitColumn } from '@duncit/table';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import EntityPodsTab from '../../shared/EntityPodsTab';
import { VENUE_PODS_TABLE, type VenuePodRow } from './queries';
import { EMPTY } from './venue-values';

const whenValue = (p: VenuePodRow) => (p.pod_date_time ? formatDateTime(p.pod_date_time) : EMPTY);

const hostsValue = (p: VenuePodRow) => p.host_names?.join(', ') || EMPTY;

const renderApproval = (p: VenuePodRow) => <Chip size="small" label={p.venue_approval_status} />;

/** Every pod booked at this venue — `venue_id` is one of the pods table's
 * allowlisted filters, so no second query exists for this list. A row opens the
 * pod's own details page. */
export default function VenuePodsTab({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();

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
    <EntityPodsTab<VenuePodRow>
      filterField="venue_id"
      filterValue={venueId}
      document={VENUE_PODS_TABLE}
      columns={columns}
      tableId="admin-venue-pods"
      title={t('admin.venueDetails.podsTitle')}
      subtitle={t('admin.venueDetails.podsSubtitle')}
      emptyText={t('admin.venueDetails.podsEmpty')}
    />
  );
}
