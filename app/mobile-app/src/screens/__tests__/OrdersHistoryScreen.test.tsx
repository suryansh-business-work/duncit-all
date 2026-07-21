import { screen, waitFor } from '@testing-library/react-native';

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

beforeEach(() => mockRequest.mockReset());

describe('OrdersHistoryScreen', () => {
  it('lists every order with its pod title and the bought variant', async () => {
    mockRequest.mockResolvedValue({
      myProductOrders: [order(), order({ id: 'o2', order_no: 'ord_2', pod: null })],
    });
    renderWithProviders(<OrdersHistoryScreen />);
    expect(screen.getByTestId('orders-loading')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByText('Sunset Jam')).toBeOnTheScreen());
    expect(screen.getAllByText(/Hoodie — L \/ Blue × 1/)).toHaveLength(2);
  });

  it('shows the empty state when there are no orders', async () => {
    mockRequest.mockResolvedValue({ myProductOrders: [] });
    renderWithProviders(<OrdersHistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('orders-empty')).toBeOnTheScreen());
  });

  it('surfaces a load error', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    renderWithProviders(<OrdersHistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('orders-error')).toHaveTextContent('offline'));
  });
});
