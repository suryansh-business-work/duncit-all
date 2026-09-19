import {
  ALL_FULFILMENT_STATUSES,
  FULFILMENT_TONE,
  TONE_CHIP_COLOR,
  statusLabel,
  type FulfilmentStatus,
} from '@duncit/utils';
import type { StatusColorMap } from '@duncit/ui';
import type { Option, Translate } from './translate';

export type { FulfilmentStatus };
export type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PICKUP_SCHEDULED'
  | 'RECEIVED'
  | 'REFUNDED'
  | 'CLOSED';
export type RefundMode = 'ORIGINAL' | 'COINS';
export type PaymentMethod = 'PREPAID' | 'COD';
/** A store product: saved but hidden, on sale, or retired. */
export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export const PRODUCT_STATUS_KEYS: Record<ProductStatus, string> = {
  DRAFT: 'ecommPortal.productStatus.draft',
  PUBLISHED: 'ecommPortal.productStatus.published',
  ARCHIVED: 'ecommPortal.productStatus.archived',
};

export const PRODUCT_STATUS_COLORS: StatusColorMap = {
  DRAFT: 'warning',
  PUBLISHED: 'success',
  ARCHIVED: 'default',
};

/** Order status → chip colour, through the shared tone so the store reads like the rest of Duncit. */
export const ORDER_STATUS_COLORS: StatusColorMap = Object.fromEntries(
  ALL_FULFILMENT_STATUSES.map((status) => [status, TONE_CHIP_COLOR[FULFILMENT_TONE[status]]]),
);

/** Every status an operator may set by hand — cancelling has its own action (stock + refund). */
export const SETTABLE_ORDER_STATUSES: readonly FulfilmentStatus[] = ALL_FULFILMENT_STATUSES.filter(
  (status) => status !== 'CANCELLED',
);

export const orderStatusOptions = (t: Translate): Option[] =>
  ALL_FULFILMENT_STATUSES.map((value) => ({ value, label: statusLabel(value, t) }));

export const RETURN_STATUS_KEYS: Record<ReturnStatus, string> = {
  REQUESTED: 'ecommPortal.returnStatus.requested',
  APPROVED: 'ecommPortal.returnStatus.approved',
  REJECTED: 'ecommPortal.returnStatus.rejected',
  PICKUP_SCHEDULED: 'ecommPortal.returnStatus.pickupScheduled',
  RECEIVED: 'ecommPortal.returnStatus.received',
  REFUNDED: 'ecommPortal.returnStatus.refunded',
  CLOSED: 'ecommPortal.returnStatus.closed',
};

export const RETURN_STATUS_COLORS: StatusColorMap = {
  REQUESTED: 'warning',
  APPROVED: 'info',
  PICKUP_SCHEDULED: 'info',
  RECEIVED: 'info',
  REFUNDED: 'success',
  REJECTED: 'error',
  CLOSED: 'default',
};

export const REFUND_MODE_KEYS: Record<RefundMode, string> = {
  ORIGINAL: 'ecommPortal.refundMode.original',
  COINS: 'ecommPortal.refundMode.coins',
};

export const PAYMENT_METHOD_KEYS: Record<PaymentMethod, string> = {
  PREPAID: 'ecommPortal.paymentMethod.prepaid',
  COD: 'ecommPortal.paymentMethod.cod',
};

/** The words for a code from one of the maps above — the code itself when the server adds a new one. */
export const codeLabel = (map: Readonly<Record<string, string>>, code: string, t: Translate): string => {
  const key = map[code];
  return key ? t(key) : code;
};

/** Every code of a map as select options, in the map's own order. */
export const codeOptions = (map: Readonly<Record<string, string>>, t: Translate): Option[] =>
  Object.keys(map).map((value) => ({ value, label: codeLabel(map, value, t) }));

/** Statuses an order can still be called off from — once it is with the courier, it cannot. */
export const CANCELLABLE_ORDER_STATUSES: ReadonlySet<string> = new Set([
  'PENDING',
  'AWAITING_SHIPMENT',
  'AWB_ASSIGNED',
  'PICKUP_SCHEDULED',
]);
