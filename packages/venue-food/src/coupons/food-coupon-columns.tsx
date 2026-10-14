import { Stack, Switch } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import type { DuncitColumn } from '@duncit/table';
import {
  foodCouponMinOrderText,
  foodCouponPerPersonText,
  foodCouponUsesText,
  foodCouponWindow,
  type FoodOwnerCoupon,
} from '@duncit/utils';
import type { Translate } from '../types';

export const getFoodCouponRowId = (row: FoodOwnerCoupon) => row.id;

export interface FoodCouponRowHandlers {
  onToggle: (row: FoodOwnerCoupon) => void;
  onEdit: (row: FoodOwnerCoupon) => void;
  onDelete: (row: FoodOwnerCoupon) => void;
}

const renderActive = (t: Translate, handlers: FoodCouponRowHandlers) => (row: FoodOwnerCoupon) => (
  <Switch
    size="small"
    checked={row.is_active}
    onChange={() => handlers.onToggle(row)}
    slotProps={{ input: { 'aria-label': t('venueFoodOwner.common.activeOf', { vars: { name: row.code } }) } }}
    data-testid={`food-coupon-active-${row.id}`}
  />
);

const renderActions = (t: Translate, handlers: FoodCouponRowHandlers) => (row: FoodOwnerCoupon) => (
  <Stack direction="row" spacing={0.5} component="span" sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
    <DuncitButton
      size="small"
      aria-label={t('venueFoodOwner.common.editNamed', { vars: { name: row.code } })}
      onClick={() => handlers.onEdit(row)}
      data-testid={`food-coupon-edit-${row.id}`}
    >
      {t('venueFoodOwner.common.edit')}
    </DuncitButton>
    <DuncitButton
      size="small"
      color="error"
      aria-label={t('venueFoodOwner.common.deleteNamed', { vars: { name: row.code } })}
      onClick={() => handlers.onDelete(row)}
      data-testid={`food-coupon-delete-${row.id}`}
    >
      {t('venueFoodOwner.common.delete')}
    </DuncitButton>
  </Stack>
);

/**
 * A venue's food coupons: the code, what it takes off, when and how often it
 * works, and the switch that turns it on or off. Sorting and filtering are
 * offered only where the server answers them.
 */
export const buildFoodCouponColumns = (t: Translate, handlers: FoodCouponRowHandlers): DuncitColumn<FoodOwnerCoupon>[] => [
  { field: 'code', headerName: t('venueFoodOwner.coupons.code'), type: 'text', width: 170, filterable: false },
  {
    field: 'description',
    headerName: t('venueFoodOwner.common.description'),
    type: 'text',
    flex: 1,
    minWidth: 200,
    sortable: false,
    filterable: false,
    valueGetter: (row) => row.description || '—',
  },
  {
    field: 'discount_pct',
    headerName: t('venueFoodOwner.coupons.colDiscount'),
    type: 'number',
    width: 130,
    valueGetter: (row) => t('venueFoodOwner.coupons.pctValue', { vars: { pct: row.discount_pct } }),
  },
  {
    field: 'min_order_amount',
    headerName: t('venueFoodOwner.coupons.minOrder'),
    type: 'number',
    width: 160,
    filterable: false,
    valueGetter: (row) => foodCouponMinOrderText(t, row),
  },
  {
    field: 'valid_from',
    headerName: t('venueFoodOwner.coupons.validFrom'),
    type: 'date',
    width: 190,
    valueGetter: (row) => foodCouponWindow(t, row, formatDateTime).from,
  },
  {
    field: 'valid_until',
    headerName: t('venueFoodOwner.coupons.validUntil'),
    type: 'date',
    width: 190,
    valueGetter: (row) => foodCouponWindow(t, row, formatDateTime).until,
  },
  {
    field: 'used_count',
    headerName: t('venueFoodOwner.coupons.colUses'),
    type: 'number',
    width: 150,
    valueGetter: (row) => foodCouponUsesText(t, row),
  },
  {
    field: 'per_phone_limit',
    headerName: t('venueFoodOwner.coupons.perPerson'),
    type: 'number',
    width: 150,
    sortable: false,
    filterable: false,
    valueGetter: (row) => foodCouponPerPersonText(t, row),
  },
  {
    field: 'is_active',
    headerName: t('venueFoodOwner.common.active'),
    type: 'boolean',
    width: 110,
    cellRenderer: renderActive(t, handlers),
    valueGetter: (row) => (row.is_active ? t('venueFoodOwner.common.active') : t('venueFoodOwner.common.inactive')),
  },
  {
    field: 'created_at',
    headerName: t('venueFoodOwner.common.created'),
    type: 'date',
    width: 190,
    hide: true,
    valueGetter: (row) => formatDateTime(row.created_at) || '—',
  },
  {
    field: 'actions',
    headerName: t('venueFoodOwner.common.actions'),
    type: 'actions',
    width: 190,
    cellRenderer: renderActions(t, handlers),
  },
];
