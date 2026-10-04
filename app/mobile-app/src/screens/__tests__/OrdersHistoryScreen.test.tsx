import { screen, waitFor } from '@testing-library/react-native';

import { MyPodShopReturnsDocument } from '@/graphql/pod-shop-returns';
import { OrdersHistoryScreen } from '@/screens/OrdersHistoryScreen';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn(), navigate: jest.fn() }),
}));

const mockRequest = graphqlRequest as jest.Mock;

const order = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  order_no: 'ord_1',
  fulfilment_method: 'PICKUP',
  fulfilment_status: 'PENDING',
  currency_symbol: '₹',
  items_total: 200,
  total: 200,
  pickup_ref: 'PU-1',
  pickup_location_id: '',
  created_at: '2026-07-20T10:00:00.000Z',
  delivered_at: null,
  cancelled_at: null,
  cancel_reason: '',
  refund: { status: 'NONE', amount: 0, coins: 0, refunded_at: null },
  returnable: [],
  pod: { id: 'p1', pod_title: 'Sunset Jam' },
  line_items: [
    {
      product_id: 'pr1',
      variant_id: 'v1',
      variant_label: 'L / Blue',
      name: 'Hoodie',
      image_url: '',
      qty: 1,
      unit_cost: 200,
      gross: 200,
    },
  ],
  shipping_address: null,
  shiprocket: { awb: '', courier_name: '', tracking_status: '', label_url: '' },
  tracking_events: [],
  ...over,
});

const podShopReturn = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  return_no: 'RET-7F3A21',
  order_id: 'o1',
  order_no: 'ord_1',
  items: [
    {
      product_id: 'pr1',
      variant_id: 'v1',
      name: 'Hoodie',
      variant_label: 'L / Blue',
      image_url: '',
      qty: 1,
      unit_cost: 200,
    },
  ],
  reason: 'Arrived damaged',
  comments: '',
  status: 'APPROVED',
  gross: 200,
  decision_note: '',
  events: [],
  pickup: { awb: '', courier_name: '', status: 'NONE', tracking_status: '', last_error: '' },
  refund: { status: 'NONE', amount: 0, coins: 0, refunded_at: null },
  created_at: '2026-07-25T10:00:00.000Z',
  ...over,
});

/** Answer each document the screen asks for: its orders, then its returns. */
const respond = (orders: unknown[], returns: unknown[] = []) =>
  mockRequest.mockImplementation((doc: unknown) =>
    Promise.resolve(
      doc === MyPodShopReturnsDocument
        ? { myPodShopReturns: returns }
        : { myProductOrders: orders },
    ),
  );

beforeEach(() => mockRequest.mockReset());

describe('OrdersHistoryScreen', () => {
  it('lists every order with its pod title and the bought variant', async () => {
    respond([order(), order({ id: 'o2', order_no: 'ord_2', pod: null })]);
    renderWithProviders(<OrdersHistoryScreen />);
    expect(screen.getByTestId('orders-loading')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByText('Sunset Jam')).toBeOnTheScreen());
    expect(screen.getAllByText(/Hoodie — L \/ Blue × 1/)).toHaveLength(2);
  });

  it('shows the empty state when there are no orders', async () => {
    respond([]);
    renderWithProviders(<OrdersHistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('orders-empty')).toBeOnTheScreen());
  });

  it('surfaces a load error', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    renderWithProviders(<OrdersHistoryScreen />);
    // The message, with a Try again under it.
    await waitFor(() => expect(screen.getByTestId('orders-error')).toHaveTextContent(/offline/));
    expect(screen.getByTestId('orders-retry')).toBeOnTheScreen();
  });

  it('tells the buyer why a cancelled order was cancelled and where the money is', async () => {
    respond([
      order({
        fulfilment_status: 'CANCELLED',
        cancelled_at: '2026-07-22T10:00:00.000Z',
        cancel_reason: 'The brand stopped selling it',
        refund: { status: 'PENDING', amount: 200, coins: 15, refunded_at: null },
      }),
    ]);
    renderWithProviders(<OrdersHistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('po-cancelled-o1')).toBeOnTheScreen());
    expect(screen.getByText('Reason: The brand stopped selling it')).toBeOnTheScreen();
    expect(screen.getByTestId('po-refund-o1-0')).toHaveTextContent(
      /initiated to your original payment/,
    );
    expect(screen.getByTestId('po-refund-o1-1')).toHaveTextContent(
      '15 coins returned to your wallet',
    );
  });

  it('lists an order’s returns under it, and offers Return items only while something can go back', async () => {
    respond(
      [
        order({
          fulfilment_status: 'PICKED_UP',
          delivered_at: '2026-07-21T10:00:00.000Z',
          returnable: [
            {
              product_id: 'pr1',
              variant_id: 'v1',
              returnable_qty: 1,
              returnable_until: '2026-07-28T10:00:00.000Z',
            },
          ],
        }),
        order({
          id: 'o2',
          order_no: 'ord_2',
          fulfilment_status: 'PICKED_UP',
          delivered_at: '2026-07-21T10:00:00.000Z',
        }),
      ],
      [podShopReturn()],
    );
    renderWithProviders(<OrdersHistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('pod-shop-return-r1')).toBeOnTheScreen());
    expect(screen.getByTestId('order-return-items-o1')).toBeOnTheScreen();
    expect(screen.queryByTestId('order-return-items-o2')).toBeNull();
    // An approved return is past the point the buyer can withdraw it.
    expect(screen.queryByTestId('pod-shop-return-withdraw-r1')).toBeNull();
  });
});
