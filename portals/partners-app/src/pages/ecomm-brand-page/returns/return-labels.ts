import type { OrderRefundStatus, PodShopReturnStatus, ReturnPickupState } from '@duncit/gql-types';
import type { StatusColorMap } from '@duncit/ui';
import type { Translate } from '../brand-wizard/wizard-steps';

/** Chip colours for a return's status. */
export const RETURN_STATUS_COLORS: StatusColorMap = {
  REQUESTED: 'warning',
  APPROVED: 'info',
  PICKUP_SCHEDULED: 'info',
  RECEIVED: 'primary',
  REFUNDED: 'success',
  REJECTED: 'error',
  CANCELLED: 'default',
};

export const RETURN_STATUSES: readonly PodShopReturnStatus[] = [
  'REQUESTED',
  'APPROVED',
  'PICKUP_SCHEDULED',
  'RECEIVED',
  'REFUNDED',
  'REJECTED',
  'CANCELLED',
];

// Every key is written out literally so the translation gate can see it.
export function returnStatusLabel(t: Translate, status: PodShopReturnStatus): string {
  switch (status) {
    case 'REQUESTED':
      return t('partners.returns.status.requested');
    case 'APPROVED':
      return t('partners.returns.status.approved');
    case 'PICKUP_SCHEDULED':
      return t('partners.returns.status.pickupScheduled');
    case 'RECEIVED':
      return t('partners.returns.status.received');
    case 'REFUNDED':
      return t('partners.returns.status.refunded');
    case 'REJECTED':
      return t('partners.returns.status.rejected');
    default:
      return t('partners.returns.status.cancelled');
  }
}

export function pickupStateLabel(t: Translate, state: ReturnPickupState): string {
  switch (state) {
    case 'BOOKED':
      return t('partners.returns.pickupState.booked');
    case 'PICKUP_SCHEDULED':
      return t('partners.returns.pickupState.scheduled');
    case 'IN_TRANSIT':
      return t('partners.returns.pickupState.inTransit');
    case 'DELIVERED':
      return t('partners.returns.pickupState.delivered');
    case 'CANCELLED':
      return t('partners.returns.pickupState.cancelled');
    case 'FAILED':
      return t('partners.returns.pickupState.failed');
    default:
      return t('partners.returns.pickupState.none');
  }
}

export function refundStatusLabel(t: Translate, status: OrderRefundStatus): string {
  switch (status) {
    case 'PENDING':
      return t('partners.returns.refundState.pending');
    case 'PROCESSED':
      return t('partners.returns.refundState.processed');
    case 'RECORDED':
      return t('partners.returns.refundState.recorded');
    case 'FAILED':
      return t('partners.returns.refundState.failed');
    default:
      return t('partners.returns.refundState.none');
  }
}
