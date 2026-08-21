import { useMemo, type MutableRefObject } from 'react';
import { Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { SosAlert } from '../../graphql/bouncer';
import { relativeTime } from '../../lib/supportTable';
import { SOS_STATUS_COLORS } from '../../lib/statusMaps';
import { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

const statusOptions = (t: Translate): ReadonlyArray<{ value: SosAlert['status']; label: string }> => [
  { value: 'ACTIVE', label: t('support.sos.statusActive') },
  { value: 'ACKNOWLEDGED', label: t('support.sos.statusAcknowledged') },
  { value: 'RESOLVED', label: t('support.sos.statusResolved') },
];

const getSosRowId = (a: SosAlert) => a.id;

const renderTicketNo = (a: SosAlert) => (
  <Typography variant="body2" component="span" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
    {a.ticket_no}
  </Typography>
);

const renderUser = (a: SosAlert) => (
  <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>
    {a.user.name}
  </Typography>
);

const renderStatus = (a: SosAlert) => <StatusChip status={a.status} colorMap={SOS_STATUS_COLORS} />;

const podValue = (a: SosAlert) =>
  a.pod.venue_name ? `${a.pod.title} · ${a.pod.venue_name}` : a.pod.title;

// Only fields the server whitelists (BOUNCER_SORTABLE) are sortable; the status
// filter maps onto the bouncerSosAlerts query's `status` arg.
const buildColumns = (t: Translate): DuncitColumn<SosAlert>[] => [
  {
    field: 'ticket_no',
    headerName: t('support.sos.colId'),
    width: 140,
    cellRenderer: renderTicketNo,
    valueGetter: (a) => a.ticket_no,
  },
  {
    field: 'user',
    headerName: t('support.sos.colUser'),
    sortable: false,
    minWidth: 140,
    cellRenderer: renderUser,
    valueGetter: (a) => a.user.name,
  },
  { field: 'pod', headerName: t('support.sos.colPod'), sortable: false, flex: 1, minWidth: 180, valueGetter: podValue },
  {
    field: 'contact_phone',
    headerName: t('shell.common.phone'),
    minWidth: 150,
    valueGetter: (a) => a.contact_phone || '—',
  },
  {
    field: 'status',
    headerName: t('shell.common.status'),
    width: 150,
    filter: { type: 'select', options: statusOptions(t) },
    cellRenderer: renderStatus,
    valueGetter: (a) => a.status,
  },
  {
    field: 'created_at',
    headerName: t('support.sos.colRaised'),
    minWidth: 160,
    valueGetter: (a) => relativeTime(a.created_at),
  },
];

interface Props {
  fetchRows: TableFetch<SosAlert>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onRowClick: (a: SosAlert) => void;
}

export default function SosTable({ fetchRows, refetchRef, onRowClick }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo(() => buildColumns(t), [t]);
  return (
    <DuncitTable<SosAlert>
      tableId="support-sos"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getSosRowId}
      onRowClick={onRowClick}
      emptyText={t('support.sos.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search message or phone"
      refetchRef={refetchRef}
    />
  );
}
