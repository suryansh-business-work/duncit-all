import type { FulfilmentStatus, StorePaymentState } from '../../graphql/orders';
import type { StoreReturnStatus } from '../../graphql/returns';

/** Copy keys for every status the buyer can see, spelled out so each key is greppable. */
export const FULFILMENT_KEYS: Record<FulfilmentStatus, string> = {
  PENDING: 'ecommStore.orderStatus.pending',
  AWAITING_SHIPMENT: 'ecommStore.orderStatus.awaitingShipment',
  AWB_ASSIGNED: 'ecommStore.orderStatus.awbAssigned',
  PICKUP_SCHEDULED: 'ecommStore.orderStatus.pickupScheduled',
  SHIPPED: 'ecommStore.orderStatus.shipped',
  OUT_FOR_DELIVERY: 'ecommStore.orderStatus.outForDelivery',
  DELIVERED: 'ecommStore.orderStatus.delivered',
  READY_FOR_PICKUP: 'ecommStore.orderStatus.readyForPickup',
  PICKED_UP: 'ecommStore.orderStatus.pickedUp',
  CANCELLED: 'ecommStore.orderStatus.cancelled',
  RTO: 'ecommStore.orderStatus.rto',
  FAILED: 'ecommStore.orderStatus.failed',
};

export const PAYMENT_KEYS: Record<StorePaymentState, string> = {
  PAID: 'ecommStore.paymentState.paid',
  PENDING: 'ecommStore.paymentState.pending',
  FAILED: 'ecommStore.paymentState.failed',
  REFUNDED: 'ecommStore.paymentState.refunded',
  REFUND_INITIATED: 'ecommStore.paymentState.refundInitiated',
  COD_PENDING: 'ecommStore.paymentState.codPending',
  COD_COLLECTED: 'ecommStore.paymentState.codCollected',
  CANCELLED: 'ecommStore.paymentState.cancelled',
};

export const RETURN_KEYS: Record<StoreReturnStatus, string> = {
  REQUESTED: 'ecommStore.returnStatus.requested',
  APPROVED: 'ecommStore.returnStatus.approved',
  REJECTED: 'ecommStore.returnStatus.rejected',
  PICKUP_SCHEDULED: 'ecommStore.returnStatus.pickupScheduled',
  RECEIVED: 'ecommStore.returnStatus.received',
  REFUNDED: 'ecommStore.returnStatus.refunded',
  CLOSED: 'ecommStore.returnStatus.closed',
};

/** A chip colour per fulfilment stage: done, trouble, or on its way. */
export function fulfilmentTone(status: FulfilmentStatus): 'success' | 'error' | 'info' {
  if (status === 'DELIVERED' || status === 'PICKED_UP') return 'success';
  if (status === 'CANCELLED' || status === 'RTO' || status === 'FAILED') return 'error';
  return 'info';
}
