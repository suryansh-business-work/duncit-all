import { Rating, Stack } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import type { DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import type { Translate } from '@duncit/shell';
import {
  FOOD_ORDER_STATUSES,
  FOOD_ORDER_STATUS_COLORS,
  FOOD_PAYMENT_STATUSES,
  FOOD_PAYMENT_STATUS_COLORS,
  canCancelFoodOrder,
  foodItemsSummary,
  foodMoney,
  foodOrderAdvanceLabel,
  foodOrderStatusLabel,
  foodPaymentStatusLabel,
  nextFoodOrderStatus,
} from './food-order-labels';
import type { FoodOrderRow, FoodOrderStatus } from './queries';

export const getFoodOrderRowId = (row: FoodOrderRow) => row.id;

export interface FoodOrderRowHandlers {
  /** Resolves when the move has been answered — the button shows its own spinner until then. */
  onAdvance: (row: FoodOrderRow, next: FoodOrderStatus) => Promise<void>;
  onView: (row: FoodOrderRow) => void;
  onCancel: (row: FoodOrderRow) => void;
}

const renderActions = (t: Translate, handlers: FoodOrderRowHandlers) => (row: FoodOrderRow) => {
  const next = row.payment_status === 'PAID' ? nextFoodOrderStatus(row.status) : null;
  const order = { vars: { no: row.order_no } };
  return (
    <Stack direction="row" spacing={0.5} component="span" sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
      {next && (
        <DuncitButton
          size="small"
          variant="contained"
          aria-label={`${foodOrderAdvanceLabel(t, next)} — ${t('partners.foodOrders.orderNo', order)}`}
          onClick={() => handlers.onAdvance(row, next)}
        >
          {foodOrderAdvanceLabel(t, next)}
        </DuncitButton>
      )}
      <DuncitButton size="small" aria-label={t('partners.foodOrders.viewOrder', order)} onClick={() => handlers.onView(row)}>
        {t('partners.foodOrders.view')}
      </DuncitButton>
      {canCancelFoodOrder(row) && (
        <DuncitButton
          size="small"
          color="error"
          aria-label={t('partners.foodOrders.cancelOrder', order)}
          onClick={() => handlers.onCancel(row)}
        >
          {t('partners.foodOrders.cancelRefund')}
        </DuncitButton>
      )}
    </Stack>
  );
};

/** The order board: who ordered what, where they sit, what they paid and how far the kitchen has got. */
export const buildFoodOrderColumns = (t: Translate, handlers: FoodOrderRowHandlers): DuncitColumn<FoodOrderRow>[] => [
  { field: 'order_no', headerName: t('partners.foodOrders.colOrder'), type: 'text', width: 150, filterable: false },
  {
    field: 'created_at',
    headerName: t('partners.foodOrders.colPlaced'),
    type: 'date',
    width: 180,
    valueGetter: (row) => formatDateTime(row.created_at) || '—',
  },
  {
    field: 'customer_name',
    headerName: t('partners.foodOrders.colGuest'),
    type: 'text',
    minWidth: 150,
    sortable: false,
    filterable: false,
  },
  {
    field: 'customer_phone',
    headerName: t('partners.foodOrders.colPhone'),
    type: 'text',
    width: 150,
    sortable: false,
    filterable: false,
  },
  {
    field: 'table_label',
    headerName: t('partners.foodOrders.colTable'),
    type: 'text',
    width: 130,
    sortable: false,
    filterable: false,
    valueGetter: (row) => row.table_label || '—',
  },
  {
    field: 'items',
    headerName: t('partners.foodOrders.colItems'),
    type: 'text',
    flex: 1,
    minWidth: 220,
    sortable: false,
    filterable: false,
    valueGetter: (row) => foodItemsSummary(t, row),
  },
  {
    field: 'total',
    headerName: t('partners.foodOrders.colTotal'),
    type: 'number',
    width: 130,
    filterable: false,
    valueGetter: (row) => foodMoney(row, row.total),
  },
  {
    field: 'payment_status',
    headerName: t('partners.foodOrders.colPayment'),
    type: 'enum',
    width: 170,
    sortable: false,
    options: FOOD_PAYMENT_STATUSES.map((value) => ({ value, label: foodPaymentStatusLabel(t, value) })),
    cellRenderer: (row) => (
      <StatusChip
        status={row.payment_status}
        colorMap={FOOD_PAYMENT_STATUS_COLORS}
        label={foodPaymentStatusLabel(t, row.payment_status)}
      />
    ),
    valueGetter: (row) => foodPaymentStatusLabel(t, row.payment_status),
  },
  {
    field: 'status',
    headerName: t('partners.foodOrders.colStatus'),
    type: 'enum',
    width: 150,
    options: FOOD_ORDER_STATUSES.map((value) => ({ value, label: foodOrderStatusLabel(t, value) })),
    cellRenderer: (row) => (
      <StatusChip status={row.status} colorMap={FOOD_ORDER_STATUS_COLORS} label={foodOrderStatusLabel(t, row.status)} />
    ),
    valueGetter: (row) => foodOrderStatusLabel(t, row.status),
  },
  {
    field: 'feedback',
    headerName: t('partners.foodOrders.colRating'),
    type: 'text',
    width: 140,
    sortable: false,
    filterable: false,
    // Blank until the guest rates the order.
    cellRenderer: (row) =>
      row.feedback ? (
        <Rating
          readOnly
          size="small"
          value={row.feedback.rating}
          aria-label={t('partners.foodOrders.ratingOutOf', { vars: { rating: row.feedback.rating } })}
        />
      ) : null,
    valueGetter: (row) =>
      row.feedback ? t('partners.foodOrders.ratingOutOf', { vars: { rating: row.feedback.rating } }) : '',
  },
  {
    field: 'actions',
    headerName: t('partners.common.action'),
    type: 'actions',
    width: 380,
    cellRenderer: renderActions(t, handlers),
  },
];
