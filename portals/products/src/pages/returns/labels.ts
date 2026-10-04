import type { ReturnStatus } from './queries';
import type { ReturnAction } from './useReturnActions';

/** Literal copy keys (the translation-key gate cannot see keys composed at the call site). */
export const RETURN_STATUS_KEY: Record<ReturnStatus, string> = {
  REQUESTED: 'products.returns.status.REQUESTED',
  APPROVED: 'products.returns.status.APPROVED',
  REJECTED: 'products.returns.status.REJECTED',
  PICKUP_SCHEDULED: 'products.returns.status.PICKUP_SCHEDULED',
  RECEIVED: 'products.returns.status.RECEIVED',
  REFUNDED: 'products.returns.status.REFUNDED',
  CANCELLED: 'products.returns.status.CANCELLED',
};

/** A history line's status may be any of the above; anything else shows as written. */
export const returnStatusKey = (status: string): string | null =>
  (RETURN_STATUS_KEY as Record<string, string>)[status] ?? null;

export const RETURN_DONE_KEY: Record<ReturnAction, string> = {
  approve: 'products.returns.done.approve',
  reject: 'products.returns.done.reject',
  retryPickup: 'products.returns.done.retryPickup',
  received: 'products.returns.done.received',
  refund: 'products.returns.done.refund',
  retryRefund: 'products.returns.done.retryRefund',
};
