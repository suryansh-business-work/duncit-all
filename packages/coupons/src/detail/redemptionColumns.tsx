import { Box, Typography } from '@mui/material';
import { EM_DASH, dateColumn, type DuncitColumn } from '@duncit/table';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { formatDate } from '@duncit/datetime';
import type { Translate } from '../i18n';
import type { CouponRedemptionRow } from '../queries';

/** The two payment states a redemption row can be in — paid, or paid then refunded. */
const STATUS_COLORS: StatusColorMap = { SUCCESS: 'success', REFUNDED: 'warning' };

const statusOptions = (t: Translate) => [
  { value: 'SUCCESS', label: t('shell.coupons.statusSuccess') },
  { value: 'REFUNDED', label: t('shell.coupons.statusRefunded') },
];

const renderMember = (r: CouponRedemptionRow) => (
  <Box component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" sx={{ fontWeight: 700, display: 'block' }}>
      {r.user_name}
    </Typography>
    <Typography
      variant="caption"
      component="span"
      sx={{ color: 'text.secondary', display: 'block' }}
    >
      {r.user_email}
    </Typography>
  </Box>
);

/** The invoice number once the payment earned one, else its gateway id. */
const paymentValue = (r: CouponRedemptionRow) => r.invoice_no ?? r.payment_id;

const renderStatus = (r: CouponRedemptionRow) => (
  <StatusChip status={r.status} colorMap={STATUS_COLORS} />
);

const localeDate = (d: Date) => formatDate(d);

/**
 * One row per payment that spent the coupon. Money is formatted with the symbol
 * the stats query reports, so a currency change in Finance moves this table
 * with it rather than leaving a hardcoded rupee behind.
 */
export function getRedemptionColumns(
  t: Translate,
  symbol: string
): DuncitColumn<CouponRedemptionRow>[] {
  const money = (value: number) => formatMoney(value, { symbol });
  return [
    {
      field: 'user_name',
      headerName: t('shell.coupons.colMember'),
      flex: 1,
      minWidth: 200,
      cellRenderer: renderMember,
      valueGetter: (r) => r.user_name,
    },
    {
      field: 'description',
      headerName: t('shell.coupons.colFor'),
      flex: 1,
      minWidth: 200,
      valueGetter: (r) => r.description || EM_DASH,
    },
    {
      field: 'coupon_discount',
      headerName: t('shell.coupons.colDiscount'),
      filter: { type: 'number' },
      width: 130,
      valueGetter: (r) => money(r.coupon_discount),
    },
    {
      field: 'total',
      headerName: t('shell.coupons.colOrderTotal'),
      filter: { type: 'number' },
      width: 140,
      valueGetter: (r) => money(r.total),
    },
    {
      field: 'status',
      headerName: t('shell.common.status'),
      filter: { type: 'select', options: statusOptions(t) },
      width: 130,
      cellRenderer: renderStatus,
      valueGetter: (r) => r.status,
    },
    {
      field: 'payment_id',
      headerName: t('shell.coupons.colPayment'),
      minWidth: 180,
      valueGetter: paymentValue,
    },
    dateColumn<CouponRedemptionRow>({
      field: 'created_at',
      headerName: t('shell.coupons.colRedeemedOn'),
      hide: false,
      minWidth: 150,
      formatDate: localeDate,
    }),
  ];
}
