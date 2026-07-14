import { useMemo, type MutableRefObject } from 'react';
import { Chip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import HostRequestRowActions from './HostRequestRowActions';
import { STATUS_OPTIONS, type HostRequest, type HostRequestStatus } from './queries';

const STATUS_COLORS: Record<HostRequestStatus, 'default' | 'info' | 'success' | 'error'> = {
  REQUESTED: 'default',
  ACKNOWLEDGED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
};

const catPath = (r: HostRequest) =>
  [r.super_category_name, r.category_name, r.sub_category_name].filter(Boolean).join(' › ') || '—';

interface Props {
  fetchRows: TableFetch<HostRequest>;
  refetchRef: MutableRefObject<(() => void) | null>;
  busy: boolean;
  onAcknowledge: (r: HostRequest) => void;
  onApprove: (r: HostRequest) => void;
  onReject: (r: HostRequest) => void;
  onDelete: (r: HostRequest) => void;
}

const getRequestRowId = (r: HostRequest) => r.id;

const renderRequestNo = (r: HostRequest) => (
  <Typography variant="body2" fontWeight={700}>{r.request_no}</Typography>
);

const hostNameValue = (r: HostRequest) => r.host_name || '—';

const requestedOnValue = (r: HostRequest) => new Date(r.created_at).toLocaleString();

const renderStatus = (r: HostRequest) => (
  <Chip size="small" color={STATUS_COLORS[r.status]} label={r.status} />
);

export default function HostRequestsTable({
  fetchRows,
  refetchRef,
  busy,
  onAcknowledge,
  onApprove,
  onReject,
  onDelete,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<HostRequest>[]>(() => {
    const renderActions = (r: HostRequest) => (
      <HostRequestRowActions
        request={r}
        busy={busy}
        onAcknowledge={onAcknowledge}
        onApprove={onApprove}
        onReject={onReject}
        onDelete={onDelete}
      />
    );
    return [
      {
        field: 'request_no',
        headerName: 'Request ID',
        minWidth: 160,
        cellRenderer: renderRequestNo,
        valueGetter: (r) => r.request_no,
      },
      {
        field: 'host_name',
        headerName: 'Host Name',
        flex: 1,
        minWidth: 150,
        filter: { type: 'text' },
        valueGetter: hostNameValue,
      },
      {
        field: 'category_name',
        headerName: 'Category',
        minWidth: 220,
        valueGetter: catPath,
      },
      {
        field: 'created_at',
        headerName: 'Requested On',
        minWidth: 180,
        filter: { type: 'date' },
        valueGetter: requestedOnValue,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 150,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (r) => r.status,
      },
      { field: 'actions', headerName: 'Action', sortable: false, width: 90, cellRenderer: renderActions },
    ];
  }, [busy, onAcknowledge, onApprove, onReject, onDelete]);

  return (
    <DuncitTable<HostRequest>
      tableId="onboarding-host-requests"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRequestRowId}
      emptyText="No host requests found."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search request no, name, email or phone"
      refetchRef={refetchRef}
    />
  );
}
