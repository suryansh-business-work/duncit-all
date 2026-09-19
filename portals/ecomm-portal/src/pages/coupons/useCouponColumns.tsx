import { useMemo } from 'react';
import { Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { actionsColumn, activeChipColumn, dateColumn, type DuncitColumn } from '@duncit/table';
import { money } from '../../lib/format';
import type { StoreCoupon } from './queries';

const renderCode = (row: StoreCoupon) => (
  <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
    {row.code}
  </Typography>
);

interface CouponColumnActions {
  onEdit: (coupon: StoreCoupon) => void;
  onDelete: (coupon: StoreCoupon) => void;
}

/** The coupon table's columns — each one the server can sort and filter, unless it says otherwise. */
export function useCouponColumns({ onEdit, onDelete }: CouponColumnActions): DuncitColumn<StoreCoupon>[] {
  const { t } = useTranslation();
  return useMemo<DuncitColumn<StoreCoupon>[]>(() => {
    const limit = (value: number | null) => (value === null ? t('ecommPortal.coupons.unlimited') : String(value));
    /** The whole store, or however many products the code is limited to. */
    const appliesTo = (count: number) => (count === 0 ? t('ecommPortal.coupons.wholeStore') : t('ecommPortal.coupons.productCount', { count }));
    return [
      { field: 'code', headerName: t('ecommPortal.coupons.code'), type: 'text', width: 150, cellRenderer: renderCode, valueGetter: (row) => row.code },
      { field: 'description', headerName: t('shell.common.description'), type: 'text', flex: 1, minWidth: 180, sortable: false, filterable: false },
      { field: 'discount_pct', headerName: t('ecommPortal.coupons.discount'), type: 'number', width: 120, valueGetter: (row) => `${row.discount_pct}%` },
      {
        field: 'product_ids',
        headerName: t('ecommPortal.coupons.appliesTo'),
        type: 'text',
        width: 140,
        sortable: false,
        filterable: false,
        valueGetter: (row) => appliesTo(row.product_ids.length),
      },
      dateColumn<StoreCoupon>({ field: 'valid_from', headerName: t('ecommPortal.coupons.validFrom'), hide: false, width: 140 }),
      dateColumn<StoreCoupon>({ field: 'valid_until', headerName: t('ecommPortal.coupons.validUntil'), hide: false, width: 140 }),
      {
        field: 'min_order_amount',
        headerName: t('ecommPortal.coupons.minOrder'),
        type: 'number',
        width: 130,
        sortable: false,
        filterable: false,
        valueGetter: (row) => money(row.min_order_amount),
      },
      { field: 'used_count', headerName: t('ecommPortal.coupons.used'), type: 'number', width: 100 },
      { field: 'max_uses', headerName: t('ecommPortal.coupons.maxUses'), type: 'number', width: 120, sortable: false, filterable: false, valueGetter: (row) => limit(row.max_uses) },
      {
        field: 'per_user_limit',
        headerName: t('ecommPortal.coupons.perUser'),
        type: 'number',
        width: 120,
        hide: true,
        sortable: false,
        filterable: false,
        valueGetter: (row) => limit(row.per_user_limit),
      },
      activeChipColumn<StoreCoupon>(),
      dateColumn<StoreCoupon>(),
      actionsColumn<StoreCoupon>({
        onEdit,
        onDelete,
        edit: { ariaLabel: (row) => t('shell.a11y.editNamed', { vars: { name: row.code } }) },
        delete: { ariaLabel: (row) => t('shell.a11y.deleteNamed', { vars: { name: row.code } }) },
      }),
    ];
  }, [t, onEdit, onDelete]);
}
