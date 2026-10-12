import type { DeletionDetail, DeletionRequestRow } from '../../src/pages/deletion-requests/queries';
import type { DeletionRefundRow } from '../../src/pages/deletion-requests/refundQueries';

/** A PENDING product deletion request; override any field. */
export const makeDeletionRequest = (over: Partial<DeletionRequestRow> = {}): DeletionRequestRow => ({
  id: 'del-1',
  request_no: 'DEL-0001',
  kind: 'PRODUCT',
  brand_id: 'b1',
  product_id: 'p1',
  parent_id: null,
  brand_name: 'Acme',
  product_name: 'Blue Mug',
  mode: 'WAIT_FOR_ORDERS',
  reason: 'Discontinued',
  scheduled_for: '2026-11-01T00:00:00.000Z',
  status: 'PENDING',
  open_orders_at_request: 2,
  requested_by_name: 'Asha',
  reviewed_by: '',
  reviewed_at: null,
  review_note: '',
  cancelled_orders: 0,
  failed_refunds: 0,
  blocked_reason: '',
  last_checked_at: null,
  completed_at: null,
  created_at: '2026-10-01T10:00:00.000Z',
  ...over,
});

export const makeDeletionDetail = (
  request: Partial<DeletionRequestRow> = {},
  impact: Partial<DeletionDetail['impact']> = {},
  events: DeletionDetail['request']['events'] = [],
): DeletionDetail => ({
  request: { ...makeDeletionRequest(request), events },
  impact: { open_orders: 0, open_returns: 0, orders: [], products: [], ...impact },
});

export const makeRefundRow = (over: Partial<DeletionRefundRow> = {}): DeletionRefundRow => ({
  id: 'o1',
  order_no: 'ORD-1',
  buyer_name: 'Ravi',
  buyer_email: 'ravi@example.com',
  brand_name: 'Acme',
  deletion_request_id: 'del-1',
  deletion_request_no: 'DEL-0001',
  currency_symbol: '₹',
  total: 499,
  cancelled_at: '2026-10-02T10:00:00.000Z',
  cancel_reason: 'Brand deleted',
  line_items: [{ name: 'Blue Mug', variant_label: 'Large', qty: 2 }],
  refund: {
    status: 'PROCESSED',
    amount: 499,
    coins: 20,
    razorpay_refund_id: 'rfnd_1',
    refunded_at: '2026-10-03T10:00:00.000Z',
    error: '',
  },
  ...over,
});
