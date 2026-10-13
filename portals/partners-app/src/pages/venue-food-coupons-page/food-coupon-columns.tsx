import { Stack, Switch } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import type { DuncitColumn } from '@duncit/table';
import { formatMoney } from '@duncit/utils';
import type { Translate } from '@duncit/shell';
import type { FoodCouponRow } from './queries';

export const getFoodCouponRowId = (row: FoodCouponRow) => row.id;

export interface FoodCouponRowHandlers {
  onToggle: (row: FoodCouponRow) => void;
  onEdit: (row: FoodCouponRow) => void;
  onDelete: (row: FoodCouponRow) => void;
}

const renderActive = (t: Translate, handlers: FoodCouponRowHandlers) => (row: FoodCouponRow) => (
  <Switch
    size="small"
    checked={row.is_active}
    onChange={() => handlers.onToggle(row)}
    slotProps={{
      input: {
        'aria-label': t('shell.a11y.fieldOf', { vars: { field: t('shell.common.active'), name: row.code } }),
      },
    }}
    data-testid={`food-coupon-active-${row.id}`}
  />
);

const renderActions = (t: Translate, handlers: FoodCouponRowHandlers) => (row: FoodCouponRow) => (
  <Stack direction="row" spacing={0.5} component="span" sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
    <DuncitButton
      size="small"
      aria-label={t('shell.a11y.editNamed', { vars: { name: row.code } })}
      onClick={() => handlers.onEdit(row)}
      data-testid={`food-coupon-edit-${row.id}`}
    >
      {t('shell.common.edit')}
    </DuncitButton>
    <DuncitButton
      size="small"
      color="error"
      aria-label={t('shell.a11y.deleteNamed', { vars: { name: row.code } })}
      onClick={() => handlers.onDelete(row)}
      data-testid={`food-coupon-delete-${row.id}`}
    >
      {t('shell.common.delete')}
    </DuncitButton>
  </Stack>
);

/** How many paid orders used the code, against its cap when it has one. */
const usesText = (t: Translate, row: FoodCouponRow) =>
  row.max_uses === null || row.max_uses === undefined
    ? t('partners.foodCoupons.usesNoLimit', { vars: { used: row.used_count } })
    : t('partners.foodCoupons.usesOf', { vars: { used: row.used_count, max: row.max_uses } });

/**
 * A venue's food coupons: the code, what it takes off, when and how often it
 * works, and the switch that turns it on or off. Sorting and filtering are
 * offered only where the server answers them.
 */
export const buildFoodCouponColumns = (t: Translate, handlers: FoodCouponRowHandlers): DuncitColumn<FoodCouponRow>[] => [
  { field: 'code', headerName: t('partners.foodCoupons.code'), type: 'text', width: 170, filterable: false },
  {
    field: 'description',
    headerName: t('shell.common.description'),
    type: 'text',
    flex: 1,
    minWidth: 200,
    sortable: false,
    filterable: false,
    valueGetter: (row) => row.description || '—',
  },
  {
    field: 'discount_pct',
    headerName: t('partners.foodCoupons.colDiscount'),
    type: 'number',
    width: 130,
    valueGetter: (row) => t('partners.foodCoupons.pctValue', { vars: { pct: row.discount_pct } }),
  },
  {
    field: 'min_order_amount',
    headerName: t('partners.foodCoupons.minOrder'),
    type: 'number',
    width: 160,
    filterable: false,
    valueGetter: (row) =>
      row.min_order_amount > 0 ? formatMoney(row.min_order_amount, { decimals: 2 }) : t('partners.foodCoupons.noMinimum'),
  },
  {
    field: 'valid_from',
    headerName: t('partners.foodCoupons.validFrom'),
    type: 'date',
    width: 190,
    valueGetter: (row) => formatDateTime(row.valid_from) || t('partners.foodCoupons.noStart'),
  },
  {
    field: 'valid_until',
    headerName: t('partners.foodCoupons.validUntil'),
    type: 'date',
    width: 190,
    valueGetter: (row) => formatDateTime(row.valid_until) || t('partners.foodCoupons.noEnd'),
  },
  {
    field: 'used_count',
    headerName: t('partners.foodCoupons.colUses'),
    type: 'number',
    width: 150,
    valueGetter: (row) => usesText(t, row),
  },
  {
    field: 'per_phone_limit',
    headerName: t('partners.foodCoupons.perPerson'),
    type: 'number',
    width: 150,
    sortable: false,
    filterable: false,
    valueGetter: (row) => row.per_phone_limit ?? t('partners.foodCoupons.noLimit'),
  },
  {
    field: 'is_active',
    headerName: t('shell.common.active'),
    type: 'boolean',
    width: 110,
    cellRenderer: renderActive(t, handlers),
    valueGetter: (row) => (row.is_active ? t('shell.common.active') : t('shell.common.inactive')),
  },
  {
    field: 'created_at',
    headerName: t('shell.common.created'),
    type: 'date',
    width: 190,
    hide: true,
    valueGetter: (row) => formatDateTime(row.created_at) || '—',
  },
  {
    field: 'actions',
    headerName: t('shell.common.actions'),
    type: 'actions',
    width: 190,
    cellRenderer: renderActions(t, handlers),
  },
];
