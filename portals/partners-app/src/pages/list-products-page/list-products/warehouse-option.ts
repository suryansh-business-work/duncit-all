import type { BrandWarehouse, WarehouseReviewStatus } from '../../ecomm-brand-page/brand-settings/warehouse.queries';

/** Why a pickup address cannot be picked, shown inline on its disabled option. */
const WAREHOUSE_STATE_SUFFIX: Record<WarehouseReviewStatus, string> = {
  APPROVED: '',
  PENDING: 'awaiting approval',
  REJECTED: 'rejected',
};

/** An approved address that is switched off reads as inactive; otherwise the review state says why. */
export const unusableReason = (warehouse: BrandWarehouse, inactiveLabel: string) =>
  warehouse.review_status === 'APPROVED' ? inactiveLabel : WAREHOUSE_STATE_SUFFIX[warehouse.review_status];
