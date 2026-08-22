import { useMemo, type MutableRefObject } from 'react';
import { Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import HostRequestRowActions from './HostRequestRowActions';
import { STATUS_OPTIONS, type HostRequest } from './queries';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/app-settings';

const STATUS_COLORS: StatusColorMap = {
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

const requestedOnValue = (r: HostRequest) => formatDateTime(r.created_at);

const renderStatus = (r: HostRequest) => (
  <StatusChip status={r.status} colorMap={STATUS_COLORS} />
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
  const { t } = useTranslation();
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
        headerName: t('onboarding.common.requestId'),
        minWidth: 160,
        cellRenderer: renderRequestNo,
        valueGetter: (r) => r.request_no,
      },
      {
        field: 'host_name',
        headerName: t('onboarding.hostRequests.hostName'),
        flex: 1,
        minWidth: 150,
        filter: { type: 'text' },
        valueGetter: hostNameValue,
      },
      {
        field: 'category_name',
        headerName: t('onboarding.common.category'),
        minWidth: 220,
        valueGetter: catPath,
      },
      {
        field: 'created_at',
        headerName: t('onboarding.hostRequests.requestedOn'),
        minWidth: 180,
        filter: { type: 'date' },
        valueGetter: requestedOnValue,
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 150,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (r) => r.status,
      },
      { field: 'actions', headerName: t('onboarding.hostRequests.action'), sortable: false, width: 90, cellRenderer: renderActions },
    ];
  }, [busy, onAcknowledge, onApprove, onReject, onDelete]);

  return (
    <DuncitTable<HostRequest>
      tableId="onboarding-host-requests"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRequestRowId}
      emptyText={t('onboarding.hostRequests.noHostRequestsFound')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search request no, name, email or phone"
      refetchRef={refetchRef}
    />
  );
}
