import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { priceFoodCartLines, type MyVenueFoodOrder, type VenueFoodItem } from '@duncit/utils';

import { FoodRatingBadge } from '@/components/details/venue-food/FoodRatingBadge';
import { FoodRunningOrders } from '@/components/details/venue-food/FoodRunningOrders';
import { VenueFoodMenuSection } from '@/components/details/venue-food/VenueFoodMenuSection';
import type { FoodOrdering } from '@/hooks/useFoodOrdering';
import type { PublicVenueDetails } from '@/hooks/useHostsVenues';
import { fetchMyFoodOrders, fetchVenueFoodRating } from '@/services/food-customer';
import { storedFoodOrderKeys } from '@/services/food-storage';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, addListener: () => () => undefined };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation }));
jest.mock('@/hooks/usePublicFinance', () => ({
  usePublicFinance: () => ({ gstPct: 0, currency: '₹' }),
}));
jest.mock('@/services/food-customer', () => ({
  fetchMyFoodOrders: jest.fn(),
  fetchVenueFoodRating: jest.fn(),
}));
jest.mock('@/services/food-storage', () => ({ storedFoodOrderKeys: jest.fn() }));
let mockOrdering: FoodOrdering;
jest.mock('@/components/details/venue-food/VenueFoodOrderingScope', () => ({
  useVenueFoodOrdering: () => mockOrdering,
}));

const fetchOrders = jest.mocked(fetchMyFoodOrders);
const fetchRating = jest.mocked(fetchVenueFoodRating);

const dish = (over: Partial<VenueFoodItem> = {}): VenueFoodItem => ({
  id: 'chai',
  name: 'Masala Chai',
  description: '',
  category: 'Drinks',
  price: 120,
  images: ['https://img/chai.jpg'],
  diet: 'VEG',
  spice_level: 'NONE',
  is_available: true,
  ...over,
});

const running = (id: string): MyVenueFoodOrder => ({
  id,
  order_no: `F-${id}`,
  venue_id: 'v1',
  venue_name: 'Cafe',
  total: 216,
  currency_symbol: '₹',
  status: 'PREPARING',
  payment_status: 'PAID',
  created_at: '2026-10-13T10:00:00.000Z',
  items: [{ name: 'Masala Chai', quantity: 2 }],
});

const venueWith = (over: Record<string, unknown> = {}) =>
  ({
    id: 'v1',
    venue_name: 'Cafe',
    offers_food: true,
    food_menu: [dish()],
    food_ordering: { enabled: true, discount_pct: 10 },
    food_licences: { fssai_number: ' 12345678901234 ' },
    ...over,
  }) as unknown as PublicVenueDetails;

const orderingWith = (over: Partial<FoodOrdering> = {}, cart: Record<string, unknown> = {}) =>
  ({
    canOrder: true,
    closed: false,
    cart: {
      lines: [],
      price: priceFoodCartLines([], 0),
      dropped: [],
      atMaxLines: false,
      hydrated: true,
      quantityOf: () => 0,
      setQuantity: jest.fn(),
      dismissDropped: jest.fn(),
      dismissMaxLines: jest.fn(),
      ...cart,
    },
    ...over,
  }) as unknown as FoodOrdering;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(storedFoodOrderKeys).mockResolvedValue([{ order_id: 'o1', access_key: 'ak1' }]);
  fetchOrders.mockResolvedValue({ rows: [], total: 0, page: 1, page_size: 20 });
  fetchRating.mockResolvedValue({ venue_id: 'v1', average: 0, count: 0 });
  mockOrdering = orderingWith();
});

describe('FoodRatingBadge', () => {
  it('shows the venue’s food rating to one decimal, and says it in full', async () => {
    fetchRating.mockResolvedValue({ venue_id: 'v1', average: 4.26, count: 12 });
    renderWithProviders(<FoodRatingBadge venueId="v1" />);

    const badge = await screen.findByTestId('venue-food-rating');
    expect(badge).toHaveTextContent(/4\.3 \(12\)/);
    expect(badge.props['aria-label']).toBe('Food rated 4.3 out of 5 by 12 guests');
    expect(fetchRating).toHaveBeenCalledWith('v1');
  });

  it('shows nothing while nobody has rated', async () => {
    renderWithProviders(<FoodRatingBadge venueId="v1" />);
    await waitFor(() => expect(fetchRating).toHaveBeenCalled());
    expect(screen.queryByTestId('venue-food-rating')).toBeNull();
  });
});

describe('FoodRunningOrders', () => {
  it('shows nothing while no order is running here', async () => {
    renderWithProviders(<FoodRunningOrders venueId="v1" />);
    await waitFor(() => expect(fetchOrders).toHaveBeenCalled());
    expect(fetchOrders).toHaveBeenCalledWith({
      scope: 'CURRENT',
      venue_id: 'v1',
      keys: [{ order_id: 'o1', access_key: 'ak1' }],
      page: 1,
      page_size: 20,
    });
    expect(screen.queryByTestId('venue-food-running-orders')).toBeNull();
  });

  it('tracks each running order on its own, with the key this device kept for it', async () => {
    fetchOrders.mockResolvedValue({
      rows: [running('o1'), running('o2')],
      total: 2,
      page: 1,
      page_size: 20,
    });
    renderWithProviders(<FoodRunningOrders venueId="v1" />);

    const first = await screen.findByTestId('venue-food-track-order-o1');
    expect(first).toHaveTextContent('Track your order F-o1');
    fireEvent.press(first);
    expect(mockNavigate).toHaveBeenLastCalledWith('VenueFoodOrder', {
      venueId: 'v1',
      orderId: 'o1',
      key: 'ak1',
    });

    // Placed while signed in on another device: the account opens it, no key rides along.
    fireEvent.press(screen.getByTestId('venue-food-track-order-o2'));
    expect(mockNavigate).toHaveBeenLastCalledWith('VenueFoodOrder', {
      venueId: 'v1',
      orderId: 'o2',
      key: undefined,
    });
  });

  it('leads on to all of the member’s food orders', async () => {
    fetchOrders.mockResolvedValue({ rows: [running('o1')], total: 1, page: 1, page_size: 20 });
    renderWithProviders(<FoodRunningOrders venueId="v1" />);
    const all = await screen.findByTestId('venue-food-my-orders');
    expect(all).toHaveTextContent('Your Food Orders');
    fireEvent.press(all);
    expect(mockNavigate).toHaveBeenCalledWith('MyFoodOrders');
  });
});

describe('VenueFoodMenuSection', () => {
  it('heads the menu with the rating and the running orders, and ends with the licence', async () => {
    fetchRating.mockResolvedValue({ venue_id: 'v1', average: 4, count: 3 });
    fetchOrders.mockResolvedValue({ rows: [running('o1')], total: 1, page: 1, page_size: 20 });
    renderWithProviders(<VenueFoodMenuSection venue={venueWith()} />);

    expect(screen.getByTestId('venue-food-menu-header')).toHaveTextContent(/Menu/);
    expect(await screen.findByTestId('venue-food-rating')).toHaveTextContent(/4\.0 \(3\)/);
    expect(await screen.findByTestId('venue-food-track-order-o1')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-food-fssai')).toHaveTextContent(
      'FSSAI Lic. No. 12345678901234',
    );
    expect(screen.getByTestId('venue-food-discount')).toHaveTextContent(/10% off on QR orders/);
    expect(screen.queryByTestId('venue-food-closed')).toBeNull();
  });

  it('opens a dish’s own screen from its name on the menu', async () => {
    renderWithProviders(<VenueFoodMenuSection venue={venueWith()} />);
    fireEvent.press(screen.getByTestId('food-item-open-chai'));
    expect(mockNavigate).toHaveBeenCalledWith('VenueFoodItem', { venueId: 'v1', itemId: 'chai' });
    await waitFor(() => expect(fetchOrders).toHaveBeenCalled());
  });

  it('opens a dish’s own screen from its card, not the photo viewer', async () => {
    renderWithProviders(<VenueFoodMenuSection venue={venueWith()} />);
    fireEvent.press(screen.getByTestId('food-item-chai'));
    expect(mockNavigate).toHaveBeenCalledWith('VenueFoodItem', { venueId: 'v1', itemId: 'chai' });
    expect(screen.queryByTestId('image-viewer')).toBeNull();
    await waitFor(() => expect(fetchOrders).toHaveBeenCalled());
  });

  it('says the venue stopped taking orders, without the QR discount it no longer gives', async () => {
    mockOrdering = orderingWith({ closed: true, canOrder: false });
    renderWithProviders(<VenueFoodMenuSection venue={venueWith()} />);
    expect(screen.getByTestId('venue-food-closed')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-food-discount')).toBeNull();
    await waitFor(() => expect(fetchOrders).toHaveBeenCalled());
  });

  it('names the dishes that left the cart, and the cart’s dish limit, each dismissable', async () => {
    mockOrdering = orderingWith({}, { dropped: ['Samosa', 'Vada'], atMaxLines: true });
    renderWithProviders(<VenueFoodMenuSection venue={venueWith()} />);

    expect(screen.getByTestId('venue-food-dropped')).toHaveTextContent(/Samosa, Vada/);
    fireEvent.press(screen.getByTestId('venue-food-dropped-dismiss'));
    expect(mockOrdering.cart.dismissDropped).toHaveBeenCalledTimes(1);

    expect(screen.getByTestId('venue-food-max-lines')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('venue-food-max-lines-dismiss'));
    expect(mockOrdering.cart.dismissMaxLines).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(fetchOrders).toHaveBeenCalled());
  });

  it('says the menu is empty, with no discount banner when the venue gives none', async () => {
    renderWithProviders(
      <VenueFoodMenuSection
        venue={venueWith({
          food_menu: [],
          food_ordering: { enabled: true, discount_pct: 0 },
          food_licences: null,
        })}
      />,
    );
    expect(screen.getByTestId('venue-food-menu-empty')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-food-discount')).toBeNull();
    expect(screen.queryByTestId('venue-food-fssai')).toBeNull();
    await waitFor(() => expect(fetchOrders).toHaveBeenCalled());
  });
});
