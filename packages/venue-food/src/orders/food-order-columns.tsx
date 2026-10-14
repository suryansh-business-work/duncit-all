import { Rating, Stack } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import type { DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import {
  FOOD_BOARD_PAYMENT_STATUSES,
  FOOD_ORDER_STATUS_COLORS,
  FOOD_OWNER_ORDER_STATUSES,
  FOOD_PAYMENT_STATUS_COLORS,
  canCancelFoodOrder,
  foodItemsSummary,
  foodOrderAdvanceLabel,
  foodOrderMoney,
  foodOrderNextStep,
  foodOrderStatusLabel,
  foodPaymentStatusLabel,
  type FoodOwnerOrder,
  type VenueFoodOrderStatus,
} from '@duncit/utils';

import type { Translate } from '../types';

export const getFoodOrderRowId = (row: FoodOwnerOrder) => row.id;

export interface FoodOrderRowHandlers {
  /** Resolves when the move has been answered — the button shows its own spinner until then. */
  onAdvance: (row: FoodOwnerOrder, next: VenueFoodOrderStatus) => Promise<void>;
  onView: (row: FoodOwnerOrder) => void;
  /** Absent when the viewer may not refund — the Cancel button is then not drawn. */
  onCancel?: (row: FoodOwnerOrder) => void;
}

const renderActions = (t: Translate, handlers: FoodOrderRowHandlers) => (row: FoodOwnerOrder) => {
  const next = foodOrderNextStep(row);
  const order = { vars: { no: row.order_no } };
  const { onCancel } = handlers;
  return (
    <Stack direction="row" spacing={0.5} component="span" sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
      {next && (
        <DuncitButton
          size="small"
          variant="contained"
          aria-label={`${foodOrderAdvanceLabel(t, next)} — ${t('venueFoodOwner.orders.orderNo', order)}`}
          onClick={() => handlers.onAdvance(row, next)}
        >
          {foodOrderAdvanceLabel(t, next)}
        </DuncitButton>
      )}
      <DuncitButton size="small" aria-label={t('venueFoodOwner.orders.viewOrder', order)} onClick={() => handlers.onView(row)}>
        {t('venueFoodOwner.orders.view')}
      </DuncitButton>
      {onCancel && canCancelFoodOrder(row) && (
        <DuncitButton
          size="small"
          color="error"
          aria-label={t('venueFoodOwner.orders.cancelOrder', order)}
          onClick={() => onCancel(row)}
        >
          {t('venueFoodOwner.orders.cancelRefund')}
        </DuncitButton>
      )}
    </Stack>
  );
};

const ratingText = (t: Translate, row: FoodOwnerOrder) =>
  row.feedback ? t('venueFoodOwner.orders.ratingOutOf', { vars: { rating: row.feedback.rating } }) : '';

/** The order board: who ordered what, where they sit, what they paid and how far the kitchen has got. */
export const buildFoodOrderColumns = (t: Translate, handlers: FoodOrderRowHandlers): DuncitColumn<FoodOwnerOrder>[] => [
  { field: 'order_no', headerName: t('venueFoodOwner.orders.colOrder'), type: 'text', width: 150, filterable: false },
  {
    field: 'created_at',
    headerName: t('venueFoodOwner.orders.colPlaced'),
    type: 'date',
    width: 180,
    valueGetter: (row) => formatDateTime(row.created_at) || '—',
  },
  {
    field: 'customer_name',
    headerName: t('venueFoodOwner.orders.colGuest'),
    type: 'text',
    minWidth: 150,
    sortable: false,
    filterable: false,
  },
  {
    field: 'customer_phone',
    headerName: t('venueFoodOwner.orders.colPhone'),
    type: 'text',
    width: 150,
    sortable: false,
    filterable: false,
  },
  {
    field: 'table_label',
    headerName: t('venueFoodOwner.orders.colTable'),
    type: 'text',
    width: 130,
    sortable: false,
    filterable: false,
    valueGetter: (row) => row.table_label || '—',
  },
  {
    field: 'items',
    headerName: t('venueFoodOwner.orders.colItems'),
    type: 'text',
    flex: 1,
    minWidth: 220,
    sortable: false,
    filterable: false,
    valueGetter: (row) => foodItemsSummary(t, row),
  },
  {
    field: 'total',
    headerName: t('venueFoodOwner.orders.colTotal'),
    type: 'number',
    width: 130,
    filterable: false,
    valueGetter: (row) => foodOrderMoney(row, row.total),
  },
  {
    field: 'payment_status',
    headerName: t('venueFoodOwner.orders.colPayment'),
    type: 'enum',
    width: 170,
    sortable: false,
    options: FOOD_BOARD_PAYMENT_STATUSES.map((value) => ({ value, label: foodPaymentStatusLabel(t, value) })),
    cellRenderer: (row) => (
      <StatusChip status={row.payment_status} colorMap={FOOD_PAYMENT_STATUS_COLORS} label={foodPaymentStatusLabel(t, row.payment_status)} />
    ),
    valueGetter: (row) => foodPaymentStatusLabel(t, row.payment_status),
  },
  {
    field: 'status',
    headerName: t('venueFoodOwner.orders.colStatus'),
    type: 'enum',
    width: 150,
    options: FOOD_OWNER_ORDER_STATUSES.map((value) => ({ value, label: foodOrderStatusLabel(t, value) })),
    cellRenderer: (row) => (
      <StatusChip status={row.status} colorMap={FOOD_ORDER_STATUS_COLORS} label={foodOrderStatusLabel(t, row.status)} />
    ),
    valueGetter: (row) => foodOrderStatusLabel(t, row.status),
  },
  {
    field: 'feedback',
    headerName: t('venueFoodOwner.orders.colRating'),
    type: 'text',
    width: 140,
    sortable: false,
    filterable: false,
    // Blank until the guest rates the order.
    cellRenderer: (row) =>
      row.feedback ? (
        <Rating readOnly size="small" value={row.feedback.rating} aria-label={ratingText(t, row)} />
      ) : null,
    valueGetter: (row) => ratingText(t, row),
  },
  {
    field: 'actions',
    headerName: t('venueFoodOwner.orders.action'),
    type: 'actions',
    width: 380,
    cellRenderer: renderActions(t, handlers),
  },
];
