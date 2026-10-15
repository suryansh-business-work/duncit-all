import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { MyVenueFoodOrder, MyVenueFoodOrdersInput } from '@duncit/utils';

import { MyFoodOrdersScreen } from '@/screens/MyFoodOrdersScreen';
import { fetchMyFoodOrders } from '@/services/food-customer';
import { storedFoodOrderKeys } from '@/services/food-storage';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
const mockNavigation = {
  canGoBack: () => true,
  goBack: jest.fn(),
  navigate: mockNavigate,
  addListener: () => () => undefined,
};
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation }));
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDate: (iso: string) => iso.slice(0, 10) }),
}));
jest.mock('@/services/food-customer', () => ({ fetchMyFoodOrders: jest.fn() }));
jest.mock('@/services/food-storage', () => ({ storedFoodOrderKeys: jest.fn() }));
// The pull gesture belongs to the navigator's provider; here its registered reload is run by hand.
let mockPull: (() => unknown) | null = null;
jest.mock('@/components/PullToRefresh', () => ({
  ...jest.requireActual<typeof import('@/components/PullToRefresh')>('@/components/PullToRefresh'),
  useRefreshRegistration: (handler: () => unknown) => {
    mockPull = handler;
  },
}));

const fetchPage = jest.mocked(fetchMyFoodOrders);

const order = (id: string, over: Partial<MyVenueFoodOrder> = {}): MyVenueFoodOrder => ({
  id,
  order_no: `F-${id}`,
  venue_id: 'v1',
  venue_name: 'Sunset Cafe',
  total: 216,
  currency_symbol: '₹',
  status: 'PREPARING',
  payment_status: 'PAID',
  created_at: '2026-10-13T10:00:00.000Z',
  items: [{ name: 'Masala Chai', quantity: 2 }],
  ...over,
});

/** Answer each section's read: the running orders, then the finished ones. */
function respond(current: MyVenueFoodOrder[], past: MyVenueFoodOrder[]) {
  fetchPage.mockImplementation((input: MyVenueFoodOrdersInput) =>
    Promise.resolve(
      input.scope === 'CURRENT'
        ? { rows: current, total: current.length, page: 1, page_size: 20 }
        : { rows: past, total: past.length, page: 1, page_size: 10 },
    ),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPull = null;
  jest.mocked(storedFoodOrderKeys).mockResolvedValue([{ order_id: 'c1', access_key: 'ak-c1' }]);
});

describe('MyFoodOrdersScreen', () => {
  it('reads the running and the finished orders, each a page at a time', async () => {
    respond([order('c1')], [order('p1', { status: 'SERVED', venue_id: 'v2' })]);
    renderWithProviders(<MyFoodOrdersScreen />);

    expect(screen.getByTestId('food-orders-current-loading')).toBeOnTheScreen();
    expect(screen.getByTestId('food-orders-past-loading')).toBeOnTheScreen();
    expect(await screen.findByTestId('food-orders-row-c1')).toBeOnTheScreen();
    expect(await screen.findByTestId('food-orders-row-p1')).toBeOnTheScreen();

    expect(screen.getByTestId('food-orders-screen-title')).toHaveTextContent('Your Food Orders');
    expect(screen.getByTestId('food-orders-current-header')).toHaveTextContent(/Current Orders/);
    expect(screen.getByTestId('food-orders-past-header')).toHaveTextContent(/Past Food Orders/);
    expect(fetchPage).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'CURRENT', venue_id: null, page: 1, page_size: 20 }),
    );
    expect(fetchPage).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'PAST', venue_id: null, page: 1, page_size: 10 }),
    );
  });

  it('opens a device order with its key, and an account order without one', async () => {
    respond([order('c1')], [order('p1', { status: 'SERVED', venue_id: 'v2' })]);
    renderWithProviders(<MyFoodOrdersScreen />);

    fireEvent.press(await screen.findByTestId('food-orders-open-c1'));
    expect(mockNavigate).toHaveBeenLastCalledWith('VenueFoodOrder', {
      venueId: 'v1',
      orderId: 'c1',
      key: 'ak-c1',
    });

    fireEvent.press(await screen.findByTestId('food-orders-open-p1'));
    expect(mockNavigate).toHaveBeenLastCalledWith('VenueFoodOrder', {
      venueId: 'v2',
      orderId: 'p1',
      key: undefined,
    });
  });

  it('says each section is empty in its own words', async () => {
    respond([], []);
    renderWithProviders(<MyFoodOrdersScreen />);
    expect(await screen.findByTestId('food-orders-current-empty-title')).toHaveTextContent(
      'No food orders in progress right now.',
    );
    expect(await screen.findByTestId('food-orders-past-empty-title')).toHaveTextContent(
      'Your finished food orders will show here.',
    );
  });

  it('re-reads both sections on a pull', async () => {
    respond([], []);
    renderWithProviders(<MyFoodOrdersScreen />);
    await screen.findByTestId('food-orders-past-empty');
    expect(fetchPage).toHaveBeenCalledTimes(2);

    respond([order('c2')], []);
    await act(async () => {
      await mockPull?.();
    });

    expect(fetchPage).toHaveBeenCalledTimes(4);
    await waitFor(() => expect(screen.getByTestId('food-orders-row-c2')).toBeOnTheScreen());
  });
});
