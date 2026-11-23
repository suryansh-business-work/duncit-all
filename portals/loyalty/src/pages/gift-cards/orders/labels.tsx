import { Chip } from '@mui/material';
import type { Translator } from '@duncit/app-settings';
import type {
  GiftCardDeliveryMode,
  GiftCardOrderFulfilmentStatus,
  GiftCardOrderPaymentStatus,
} from './queries';

type ChipColor = 'success' | 'info' | 'default' | 'error' | 'warning' | 'primary';

/** Literal keys per status — the localization gate greps for `t('…')`. */
export const fulfilmentLabels = (t: Translator['t']): Record<GiftCardOrderFulfilmentStatus, string> => ({
  PENDING: t('loyalty.giftOrders.fulfilmentPending'),
  PROCESSING: t('loyalty.giftOrders.fulfilmentProcessing'),
  PRINTED: t('loyalty.giftOrders.fulfilmentPrinted'),
  AWAITING_SHIPMENT: t('loyalty.giftOrders.fulfilmentAwaitingShipment'),
  AWB_ASSIGNED: t('loyalty.giftOrders.fulfilmentAwbAssigned'),
  PICKUP_SCHEDULED: t('loyalty.giftOrders.fulfilmentPickupScheduled'),
  SHIPPED: t('loyalty.giftOrders.fulfilmentShipped'),
  OUT_FOR_DELIVERY: t('loyalty.giftOrders.fulfilmentOutForDelivery'),
  DELIVERED: t('loyalty.giftOrders.fulfilmentDelivered'),
  NDR: t('loyalty.giftOrders.fulfilmentNdr'),
  RTO: t('loyalty.giftOrders.fulfilmentRto'),
  RTO_DELIVERED: t('loyalty.giftOrders.fulfilmentRtoDelivered'),
  LOST: t('loyalty.giftOrders.fulfilmentLost'),
  CANCELLED: t('loyalty.giftOrders.fulfilmentCancelled'),
  FAILED: t('loyalty.giftOrders.fulfilmentFailed'),
});

const FULFILMENT_COLORS: Record<GiftCardOrderFulfilmentStatus, ChipColor> = {
  PENDING: 'default',
  PROCESSING: 'warning',
  PRINTED: 'info',
  AWAITING_SHIPMENT: 'info',
  AWB_ASSIGNED: 'info',
  PICKUP_SCHEDULED: 'info',
  SHIPPED: 'primary',
  OUT_FOR_DELIVERY: 'primary',
  DELIVERED: 'success',
  NDR: 'warning',
  RTO: 'error',
  RTO_DELIVERED: 'error',
  LOST: 'error',
  CANCELLED: 'default',
  FAILED: 'error',
};

export const paymentLabels = (t: Translator['t']): Record<GiftCardOrderPaymentStatus, string> => ({
  PENDING: t('loyalty.giftOrders.paymentPending'),
  PAID: t('loyalty.giftOrders.paymentPaid'),
  FAILED: t('loyalty.giftOrders.paymentFailed'),
  REFUNDED: t('loyalty.giftOrders.paymentRefunded'),
});

const PAYMENT_COLORS: Record<GiftCardOrderPaymentStatus, ChipColor> = {
  PENDING: 'default',
  PAID: 'success',
  FAILED: 'error',
  REFUNDED: 'warning',
};

export const deliveryLabels = (t: Translator['t']): Record<GiftCardDeliveryMode, string> => ({
  DIGITAL: t('loyalty.giftOrders.deliveryDigital'),
  PHYSICAL: t('loyalty.giftOrders.deliveryPhysical'),
});

/** What each audit row records, in words. */
export const historyLabels = (t: Translator['t']): Record<string, string> => ({
  ORDER_PLACED: t('loyalty.giftOrders.historyPlaced'),
  ORDER_PAID: t('loyalty.giftOrders.historyPaid'),
  CARDS_ISSUED: t('loyalty.giftOrders.historyIssued'),
  CARDS_EMAILED: t('loyalty.giftOrders.historyEmailed'),
  STOCK_SHORT: t('loyalty.giftOrders.historyStockShort'),
  ORDER_PRINTED: t('loyalty.giftOrders.historyPrinted'),
  ADDRESS_UPDATED: t('loyalty.giftOrders.historyAddress'),
  SHIPMENT_BOOKED: t('loyalty.giftOrders.historyBooked'),
  SHIPMENT_FAILED: t('loyalty.giftOrders.historyBookingFailed'),
  STATUS_CHANGED: t('loyalty.giftOrders.historyStatus'),
});

export const fulfilmentOptions = (t: Translator['t']) =>
  Object.entries(fulfilmentLabels(t)).map(([value, label]) => ({ value, label }));
export const paymentOptions = (t: Translator['t']) =>
  Object.entries(paymentLabels(t)).map(([value, label]) => ({ value, label }));
export const deliveryOptions = (t: Translator['t']) =>
  Object.entries(deliveryLabels(t)).map(([value, label]) => ({ value, label }));

export function FulfilmentChip({ status, t }: Readonly<{ status: GiftCardOrderFulfilmentStatus; t: Translator['t'] }>) {
  return <Chip size="small" variant="outlined" color={FULFILMENT_COLORS[status]} label={fulfilmentLabels(t)[status]} sx={{ fontWeight: 800 }} />;
}

export function PaymentChip({ status, t }: Readonly<{ status: GiftCardOrderPaymentStatus; t: Translator['t'] }>) {
  return <Chip size="small" color={PAYMENT_COLORS[status]} label={paymentLabels(t)[status]} sx={{ fontWeight: 800 }} />;
}
