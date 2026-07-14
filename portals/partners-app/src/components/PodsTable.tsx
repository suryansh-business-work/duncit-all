import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { format } from 'date-fns';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';

/** Minimal row shape shared by the partner + club-admin pods tables. */
export interface PodRowBase {
  id: string;
  pod_title: string;
  club_id?: string | null;
  venue_id?: string | null;
  pod_mode?: string | null;
  pod_date_time?: string | null;
  pod_amount?: number | null;
  pod_attendees?: string[] | null;
  is_active: boolean;
  completed_at?: string | null;
}

interface Props<T extends PodRowBase> {
  tableId: string;
  fetchRows: TableFetch<T>;
  refetchRef?: MutableRefObject<(() => void) | null>;
  venueName: (id?: string | null) => string;
  /** When provided, the club name renders as a caption under the pod title. */
  clubName?: (id: string) => string;
  emptyText: string;
  toolbarActions?: ReactNode;
  /** When provided, a trailing Actions column renders this per row. */
  renderActions?: (pod: T) => ReactNode;
}

const podStatusLabel = (pod: PodRowBase): string => {
  if (pod.completed_at) return 'Completed';
  return pod.is_active ? 'Active' : 'Draft';
};

const podStatusColor = (pod: PodRowBase): 'success' | 'info' | 'default' => {
  if (pod.completed_at) return 'success';
  return pod.is_active ? 'info' : 'default';
};

const renderStatus = (pod: PodRowBase) => (
  <Chip size="small" label={podStatusLabel(pod)} color={podStatusColor(pod)} />
);

const dateValue = (pod: PodRowBase) =>
  pod.pod_date_time ? format(new Date(pod.pod_date_time), 'dd MMM yyyy, h:mm a') : 'Not scheduled';

const attendeesValue = (pod: PodRowBase) => pod.pod_attendees?.length ?? 0;

const getPodRowId = (pod: PodRowBase) => pod.id;

export default function PodsTable<T extends PodRowBase>({
  tableId,
  fetchRows,
  refetchRef,
  venueName,
  clubName,
  emptyText,
  toolbarActions,
  renderActions,
}: Readonly<Props<T>>) {
  const columns = useMemo<DuncitColumn<T>[]>(() => {
    const renderPod = (pod: T) => (
      <Box sx={{ lineHeight: 1.2 }}>
        <Typography variant="body2" fontWeight={900} component="div">
          {pod.pod_title}
        </Typography>
        {clubName && pod.club_id && (
          <Typography variant="caption" color="text.secondary" component="div">
            {clubName(pod.club_id)}
          </Typography>
        )}
      </Box>
    );
    const placeValue = (pod: T) =>
      pod.pod_mode === 'VIRTUAL' ? 'Virtual pod' : venueName(pod.venue_id);
    const cols: DuncitColumn<T>[] = [
      {
        field: 'pod_title',
        headerName: 'Pod',
        flex: 1,
        minWidth: 200,
        cellRenderer: renderPod,
        valueGetter: (pod) => pod.pod_title,
      },
      { field: 'place', headerName: 'Place', sortable: false, minWidth: 150, valueGetter: placeValue },
      {
        field: 'pod_date_time',
        headerName: 'Date',
        filter: { type: 'date' },
        minWidth: 175,
        valueGetter: dateValue,
      },
      { field: 'attendees', headerName: 'Attendees', sortable: false, width: 110, valueGetter: attendeesValue },
      {
        field: 'is_active',
        headerName: 'Status',
        filter: { type: 'boolean' },
        width: 120,
        cellRenderer: renderStatus,
        valueGetter: podStatusLabel,
      },
      {
        field: 'pod_amount',
        headerName: 'Amount',
        filter: { type: 'number' },
        hide: true,
        width: 110,
        valueGetter: (pod) => pod.pod_amount ?? 0,
      },
      {
        field: 'completed_at',
        headerName: 'Completed',
        filter: { type: 'date' },
        hide: true,
        width: 140,
        valueGetter: (pod) => (pod.completed_at ? format(new Date(pod.completed_at), 'dd MMM yyyy') : '—'),
      },
    ];
    if (renderActions) {
      cols.push({
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        width: 120,
        cellRenderer: renderActions,
      });
    }
    return cols;
  }, [clubName, venueName, renderActions]);

  return (
    <DuncitTable<T>
      tableId={tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPodRowId}
      toolbarActions={toolbarActions}
      emptyText={emptyText}
      defaultSort={{ field: 'pod_date_time', dir: 'desc' }}
      searchPlaceholder="Search pod title or ID"
      refetchRef={refetchRef}
    />
  );
}
