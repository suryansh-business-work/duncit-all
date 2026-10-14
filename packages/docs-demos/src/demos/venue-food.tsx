import { Stack } from '@mui/material';
import { FoodBreakdowns, FoodDailyChart, FoodRecentFeedback, FoodStatTiles } from '@duncit/venue-food';
import {
  blankFoodOrdering,
  canCancelFoodOrder,
  canTakeFoodOrders,
  foodOrderNextStep,
  toFoodMenuSaveInput,
  type FoodMenuFormValues,
  type FoodMenuMode,
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

interface MenuMock {
  mode: FoodMenuMode;
  sendAccount: boolean;
  savedGstin: string;
  values: FoodMenuFormValues;
}

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
  defineDemo<MenuMock>({
    id: 'menu-save',
    title: 'What the menu editor sends for a café’s menu',
    note:
      'The Partners console names the Razorpay account it picked; the Venues console and the app never do, so the owner’s link stays. Switch offers_food off and only the switch is sent. Mode admin may change a saved GST number; an owner gives it once.',
    mock: {
      mode: 'owner',
      sendAccount: true,
      savedGstin: '',
      values: {
        offers_food: true,
        food_menu: [
          { item_id: 'dish-1', name: 'Masala dosa', description: 'Crisp, with sambar', category: 'Mains', price: '120', images: [], diet: 'VEG', spice_level: 'MILD', is_available: true },
          { item_id: '', name: 'Filter coffee', description: '', category: 'Drinks', price: '40', images: [], diet: 'VEG', spice_level: 'NONE', is_available: true },
        ],
        food_ordering: { ...blankFoodOrdering, enabled: true, razorpay_integration_id: 'rzp-1', razorpay_linked: true, discount_pct: '10' },
        gstin: '22ABCDE1234F1Z5',
      },
    },
    compute: (mock) => ({
      'Can take orders': canTakeFoodOrders(mock.values.food_menu, mock.values.food_ordering.razorpay_linked),
      'updateApprovedVenue input': toFoodMenuSaveInput(mock.values, mock),
    }),
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
