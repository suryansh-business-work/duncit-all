import { Stack, Typography } from '@mui/material';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import type { DateFormatter, useTranslation } from '@duncit/app-settings';
import type { DeletionKind, DeletionRequestRow } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];
type Formatter = Pick<DateFormatter, 'formatDate' | 'formatDateTime'>;

export const DELETION_STATUS_COLORS: StatusColorMap = {
  PENDING: 'warning',
  APPROVED: 'info',
  REJECTED: 'error',
  WITHDRAWN: 'default',
  COMPLETED: 'success',
};

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'COMPLETED'];
const MODES = ['WAIT_FOR_ORDERS', 'CANCEL_AND_REFUND'] as const;

/** Where the request is, with why it is waiting when the date has come but orders are still running. */
const renderStatus = (row: DeletionRequestRow, t: Translate) => (
  <Stack component="span" sx={{ lineHeight: 1.2, minWidth: 0 }}>
    <StatusChip status={row.status} label={t(`products.deletionRequests.status.${row.status}`)} colorMap={DELETION_STATUS_COLORS} />
    {row.blocked_reason && row.status === 'APPROVED' && (
      <Typography variant="caption" component="span" noWrap sx={{ color: 'warning.main' }}>
        {row.blocked_reason}
      </Typography>
    )}
  </Stack>
);

export const deletionColumns = (kind: DeletionKind, t: Translate, f: Formatter): DuncitColumn<DeletionRequestRow>[] => {
  const name: DuncitColumn<DeletionRequestRow> =
    kind === 'BRAND'
      ? { field: 'brand_name', headerName: t('products.deletionRequests.colBrand'), type: 'text', minWidth: 200 }
      : {
          field: 'product_name',
          headerName: t('products.deletionRequests.colProduct'),
          type: 'text',
          minWidth: 220,
          cellRenderer: (row) => (
            <Stack component="span" sx={{ lineHeight: 1.2, minWidth: 0 }}>
              <Typography variant="body2" component="span" noWrap sx={{ fontWeight: 700 }}>
                {row.product_name}
              </Typography>
              <Typography variant="caption" component="span" noWrap sx={{ color: 'text.secondary' }}>
                {row.brand_name}
                {row.parent_id ? ` · ${t('products.deletionRequests.partOfBrand')}` : ''}
              </Typography>
            </Stack>
          ),
        };
  return [
    { field: 'request_no', headerName: t('products.deletionRequests.colRequest'), type: 'text', width: 130 },
    name,
    {
      field: 'status',
      headerName: t('products.deletionRequests.colStatus'),
      type: 'enum',
      options: STATUSES.map((s) => ({ value: s, label: t(`products.deletionRequests.status.${s}`) })),
      minWidth: 200,
      cellRenderer: (row) => renderStatus(row, t),
    },
    {
      field: 'mode',
      headerName: t('products.deletionRequests.colMode'),
      type: 'enum',
      options: MODES.map((m) => ({ value: m, label: t(`products.deletionRequests.mode.${m}`) })),
      minWidth: 200,
      valueGetter: (row) => t(`products.deletionRequests.mode.${row.mode}`),
    },
    {
      field: 'scheduled_for',
      headerName: t('products.deletionRequests.colScheduled'),
      type: 'date',
      width: 140,
      valueGetter: (row) => (row.scheduled_for ? f.formatDate(row.scheduled_for) : EM_DASH),
    },
    {
      field: 'open_orders_at_request',
      headerName: t('products.deletionRequests.colOpenOrders'),
      type: 'number',
      width: 130,
      sortable: false,
      filterable: false,
    },
    {
      field: 'requested_by_name',
      headerName: t('products.deletionRequests.colRequestedBy'),
      type: 'text',
      hide: true,
      minWidth: 160,
      sortable: false,
      filterable: false,
    },
    {
      field: 'created_at',
      headerName: t('products.deletionRequests.colRaised'),
      type: 'date',
      width: 170,
      valueGetter: (row) => (row.created_at ? f.formatDateTime(row.created_at) : EM_DASH),
    },
  ];
};
