import { useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { money } from '../../lib/format';
import { codeLabel, codeOptions } from '../../lib/status';
import type { StorePaymentRow } from './queries';

/** A payment's state, in the store's words. */
const PAYMENT_STATUS_KEYS: Record<string, string> = {
  PENDING: 'ecommPortal.paymentLogs.statusPending',
  SUCCESS: 'ecommPortal.paymentLogs.statusSuccess',
  FAILED: 'ecommPortal.paymentLogs.statusFailed',
  REFUNDED: 'ecommPortal.paymentLogs.statusRefunded',
};

const PAYMENT_STATUS_COLORS: StatusColorMap = {
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'error',
  REFUNDED: 'info',
};

/** Pending, paid, failed or refunded — in words as well as colour. */
function PaymentStatusChip({ status }: Readonly<{ status: string }>) {
  const { t } = useTranslation();
  return (
    <StatusChip
      status={status}
      label={codeLabel(PAYMENT_STATUS_KEYS, status, t)}
      colorMap={PAYMENT_STATUS_COLORS}
      data-testid="payment-logs-status"
    />
  );
}

/** Who paid: name over email. */
const renderBuyer = (row: StorePaymentRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }} data-testid="payment-logs-buyer">
    <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
      {row.user_name}
    </Typography>
    <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
      {row.user_email}
    </Typography>
  </Stack>
);

/** The payment's id over its invoice number, both in monospace so they can be read back. */
const renderIds = (row: StorePaymentRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }} data-testid="payment-logs-ids">
    <Typography variant="caption" component="span" sx={{ fontFamily: 'monospace' }}>
      {row.payment_id}
    </Typography>
    {row.invoice_no && (
      <Typography variant="caption" component="span" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
        {row.invoice_no}
      </Typography>
    )}
  </Stack>
);

const renderStatus = (row: StorePaymentRow) => <PaymentStatusChip status={row.status} />;

/** The payment table's columns — each one the server can sort and filter, unless it says otherwise. */
export function usePaymentColumns(): DuncitColumn<StorePaymentRow>[] {
  const { t } = useTranslation();
  return useMemo<DuncitColumn<StorePaymentRow>[]>(
    () => [
      dateColumn<StorePaymentRow>({ headerName: t('ecommPortal.paymentLogs.when'), hide: false, width: 150 }),
      {
        field: 'user_name',
        headerName: t('ecommPortal.paymentLogs.buyer'),
        type: 'text',
        minWidth: 220,
        flex: 1,
        cellRenderer: renderBuyer,
        valueGetter: (row) => row.user_name,
      },
      { field: 'gateway', headerName: t('ecommPortal.paymentLogs.gateway'), type: 'text', width: 120 },
      {
        field: 'total',
        headerName: t('ecommPortal.paymentLogs.total'),
        type: 'number',
        width: 130,
        valueGetter: (row) => money(row.total, row.currency_symbol),
      },
      {
        field: 'status',
        headerName: t('ecommPortal.paymentLogs.status'),
        type: 'enum',
        options: codeOptions(PAYMENT_STATUS_KEYS, t),
        width: 130,
        cellRenderer: renderStatus,
        valueGetter: (row) => codeLabel(PAYMENT_STATUS_KEYS, row.status, t),
      },
      {
        field: 'payment_id',
        headerName: t('ecommPortal.paymentLogs.ids'),
        type: 'text',
        minWidth: 200,
        cellRenderer: renderIds,
        valueGetter: (row) => row.payment_id,
      },
      dateColumn<StorePaymentRow>({ field: 'paid_at', headerName: t('ecommPortal.paymentLogs.paidAt'), width: 150 }),
      {
        field: 'coupon_code',
        headerName: t('ecommPortal.paymentLogs.coupon'),
        type: 'text',
        width: 130,
        hide: true,
        valueGetter: (row) => row.coupon_code || EM_DASH,
      },
      { field: 'coins_redeemed', headerName: t('ecommPortal.paymentLogs.coins'), type: 'number', width: 120, hide: true },
    ],
    [t],
  );
}
