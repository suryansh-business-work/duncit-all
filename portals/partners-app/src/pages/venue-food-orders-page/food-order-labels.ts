import type { StatusColorMap } from '@duncit/ui';
import type { Translate } from '@duncit/shell';
import { formatMoney } from '@duncit/utils';
import type { FoodOrderRow, FoodOrderStatus, FoodPaymentStatus } from './queries';

/** The kitchen's path — an order only ever moves forward along it. */
const FLOW: readonly FoodOrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'];

export const FOOD_ORDER_STATUSES: readonly FoodOrderStatus[] = [...FLOW, 'CANCELLED'];

/** Only paid and refunded orders reach the board. */
export const FOOD_PAYMENT_STATUSES: readonly FoodPaymentStatus[] = ['PAID', 'REFUND_PENDING', 'REFUNDED'];

export const FOOD_ORDER_STATUS_COLORS: StatusColorMap = {
  PLACED: 'warning',
  ACCEPTED: 'info',
  PREPARING: 'info',
  READY: 'primary',
  SERVED: 'success',
  CANCELLED: 'error',
};

export const FOOD_PAYMENT_STATUS_COLORS: StatusColorMap = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'error',
  REFUND_PENDING: 'warning',
  REFUNDED: 'default',
};

/** The step after `status`, or null once served or cancelled. */
export const nextFoodOrderStatus = (status: FoodOrderStatus): FoodOrderStatus | null => {
  const index = FLOW.indexOf(status);
  return index >= 0 && index < FLOW.length - 1 ? FLOW[index + 1] : null;
};

/** The server refuses a cancel once the food is served or the order is already off. */
export const canCancelFoodOrder = (row: Pick<FoodOrderRow, 'status' | 'payment_status'>) =>
  row.payment_status === 'PAID' && row.status !== 'SERVED' && row.status !== 'CANCELLED';

export const foodOrderStatusLabel = (t: Translate, status: string): string => {
  const labels: Record<string, string> = {
    PLACED: t('partners.foodOrders.status.PLACED'),
    ACCEPTED: t('partners.foodOrders.status.ACCEPTED'),
    PREPARING: t('partners.foodOrders.status.PREPARING'),
    READY: t('partners.foodOrders.status.READY'),
    SERVED: t('partners.foodOrders.status.SERVED'),
    CANCELLED: t('partners.foodOrders.status.CANCELLED'),
  };
  return labels[status] ?? status;
};

export const foodPaymentStatusLabel = (t: Translate, status: string): string => {
  const labels: Record<string, string> = {
    PENDING: t('partners.foodOrders.payment.PENDING'),
    PAID: t('partners.foodOrders.payment.PAID'),
    FAILED: t('partners.foodOrders.payment.FAILED'),
    REFUND_PENDING: t('partners.foodOrders.payment.REFUND_PENDING'),
    REFUNDED: t('partners.foodOrders.payment.REFUNDED'),
  };
  return labels[status] ?? status;
};

/** What the "next step" button says for the status it moves the order TO. */
export const foodOrderAdvanceLabel = (t: Translate, next: FoodOrderStatus): string => {
  const labels: Partial<Record<FoodOrderStatus, string>> = {
    ACCEPTED: t('partners.foodOrders.advance.ACCEPTED'),
    PREPARING: t('partners.foodOrders.advance.PREPARING'),
    READY: t('partners.foodOrders.advance.READY'),
    SERVED: t('partners.foodOrders.advance.SERVED'),
  };
  return labels[next] ?? foodOrderStatusLabel(t, next);
};

/** An amount in the order's own currency, as the server stamped it. */
export const foodMoney = (row: Pick<FoodOrderRow, 'currency_symbol'>, amount: number) =>
  formatMoney(amount, { symbol: row.currency_symbol, decimals: 2 });

/** "2 × Masala dosa, 1 × Filter coffee". */
export const foodItemsSummary = (t: Translate, row: Pick<FoodOrderRow, 'items'>) =>
  row.items.map((line) => t('partners.foodOrders.itemLine', { vars: { qty: line.quantity, name: line.name } })).join(', ');
