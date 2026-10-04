import type { DeletionRequestRow } from './queries';

/**
 * The copy key for each deletion status and mode, written out in full — the
 * translation-key gate only sees literal keys, never ones composed at the call site.
 */
export const DELETION_STATUS_KEY: Record<DeletionRequestRow['status'], string> = {
  PENDING: 'products.deletionRequests.status.PENDING',
  APPROVED: 'products.deletionRequests.status.APPROVED',
  REJECTED: 'products.deletionRequests.status.REJECTED',
  WITHDRAWN: 'products.deletionRequests.status.WITHDRAWN',
  COMPLETED: 'products.deletionRequests.status.COMPLETED',
};

export const DELETION_MODE_KEY: Record<DeletionRequestRow['mode'], string> = {
  WAIT_FOR_ORDERS: 'products.deletionRequests.mode.WAIT_FOR_ORDERS',
  CANCEL_AND_REFUND: 'products.deletionRequests.mode.CANCEL_AND_REFUND',
};

/** Page copy per kind. */
export const DELETION_PAGE_KEYS = {
  PRODUCT: {
    title: 'products.deletionRequests.products.title',
    description: 'products.deletionRequests.products.description',
    empty: 'products.deletionRequests.products.empty',
  },
  BRAND: {
    title: 'products.deletionRequests.brands.title',
    description: 'products.deletionRequests.brands.description',
    empty: 'products.deletionRequests.brands.empty',
  },
} as const;
