import { Stack } from '@mui/material';
import { FoodBreakdowns, FoodDailyChart, FoodRecentFeedback, FoodStatTiles } from '@duncit/venue-food';
import {
  canCancelFoodOrder,
  foodOrderNextStep,
  type FoodOwnerStats,
  type VenueFoodOrderStatus,
  type VenueFoodPaymentStatus,
} from '@duncit/utils';
import { defineDemo, defineDemos } from '../types';

const STATS: FoodOwnerStats = {
  days: 30,
  currency_symbol: '₹',
  orders: 42,
  revenue: 18_640,
  average_order: 443.81,
  discount_given: 1_120,
  coupon_orders: 9,
  served: 37,
  cancelled: 2,
  refunded: 610,
  invoice_downloads: 14,
  subscribe_opt_ins: 11,
  subscribers: 58,
  page_scans: 196,
  table_scans: 233,
  feedback_count: 19,
  average_rating: 4.4,
  status_counts: [
    { status: 'SERVED', count: 37 },
    { status: 'PREPARING', count: 2 },
    { status: 'PLACED', count: 1 },
    { status: 'CANCELLED', count: 2 },
  ],
  top_items: [
    { name: 'Masala dosa', quantity: 61, revenue: 7_320 },
    { name: 'Filter coffee', quantity: 74, revenue: 2_960 },
    { name: 'Paneer tikka', quantity: 18, revenue: 4_140 },
  ],
  daily: [
    { date: '2026-10-08', orders: 5, revenue: 2_210 },
    { date: '2026-10-09', orders: 7, revenue: 3_080 },
    { date: '2026-10-10', orders: 4, revenue: 1_760 },
    { date: '2026-10-11', orders: 12, revenue: 5_320 },
    { date: '2026-10-12', orders: 14, revenue: 6_270 },
  ],
  recent_feedback: [
    {
      order_no: 'F-1042',
      customer_name: 'Asha Rao',
      rating: 5,
      comment: 'Dosa came out crisp and the coffee was hot. Lovely after the run.',
      images: [],
      submitted_at: '2026-10-12T09:40:00.000Z',
    },
  ],
};

interface FlowMock {
  status: VenueFoodOrderStatus;
  payment_status: VenueFoodPaymentStatus;
}

export default defineDemos('venue-food', [
  defineDemo<{ stats: FoodOwnerStats }>({
    id: 'dashboard',
    title: 'A café’s month of QR food orders',
    note:
      'Edit the counts and the tiles, bars and trend follow. The full VenueFoodDashboard reads these numbers from venueFoodStats; here they are handed in.',
    mock: { stats: STATS },
    render: (mock) => (
      <Stack spacing={2}>
        <FoodStatTiles stats={mock.stats} />
        <FoodBreakdowns stats={mock.stats} />
        <FoodDailyChart daily={mock.stats.daily} currencySymbol={mock.stats.currency_symbol} />
        <FoodRecentFeedback feedback={mock.stats.recent_feedback} />
      </Stack>
    ),
  }),
  defineDemo<FlowMock>({
    id: 'order-flow',
    title: 'What the order board offers for an order',
    note: 'Set the status to SERVED or the payment to REFUNDED and both actions go away — the same rule the server applies.',
    mock: { status: 'PREPARING', payment_status: 'PAID' },
    compute: (mock) => ({
      'Next step': foodOrderNextStep(mock),
      'Can cancel & refund': canCancelFoodOrder(mock),
    }),
  }),
]);
