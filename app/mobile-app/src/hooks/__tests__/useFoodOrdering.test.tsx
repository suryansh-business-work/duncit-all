import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useFoodOrdering } from '@/hooks/useFoodOrdering';
import type { PublicVenueDetails } from '@/hooks/useHostsVenues';
import { readFoodCart, readFoodCoupon, readFoodGuest } from '@/services/food-storage';

type Listener = () => void;
const mockListeners: Record<string, Listener[]> = {};
const mockOff = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
  addListener: jest.fn((event: string, listener: Listener) => {
    (mockListeners[event] ??= []).push(listener);
    return mockOff;
  }),
};
let mockParams: { venueId: string; table?: string } | undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'key-1' }));
jest.mock('@/services/food-storage', () => ({
  readFoodCart: jest.fn(),
  writeFoodCart: jest.fn(() => Promise.resolve()),
  readFoodCoupon: jest.fn(),
  writeFoodCoupon: jest.fn(() => Promise.resolve()),
  readFoodGuest: jest.fn(),
  writeFoodGuest: jest.fn(() => Promise.resolve()),
  saveFoodOrder: jest.fn(() => Promise.resolve()),
}));

const cartRead = jest.mocked(readFoodCart);
const couponRead = jest.mocked(readFoodCoupon);

const emit = (event: string) => act(() => mockListeners[event]?.forEach((listener) => listener()));

const venue = {
  id: 'v1',
  offers_food: true,
  food_menu: [
    {
      id: 'chai',
      name: 'Masala Chai',
      description: '',
      category: 'Drinks',
      price: 120,
      images: [],
      diet: 'VEG',
      spice_level: 'NONE',
      is_available: true,
    },
  ],
  food_ordering: { enabled: true, discount_pct: 0 },
} as unknown as PublicVenueDetails;

const onRefresh = jest.fn(() => Promise.resolve());
const SAVE20 = { code: 'SAVE20', coupon_pct: 20, min_order_amount: 0 };

beforeEach(() => {
  jest.clearAllMocks();
  for (const event of Object.keys(mockListeners)) delete mockListeners[event];
  mockParams = { venueId: 'v1' };
  cartRead.mockResolvedValue({ chai: 1 });
  couponRead.mockResolvedValue(null);
  jest.mocked(readFoodGuest).mockResolvedValue(null);
});

describe('useFoodOrdering — coming back to the menu', () => {
  it('re-reads the kept cart and coupon only after the menu was left', async () => {
    const { result } = renderHook(() => useFoodOrdering(venue, onRefresh));
    await waitFor(() => expect(result.current.cart.hydrated).toBe(true));
    expect(result.current.cart.quantityOf('chai')).toBe(1);
    expect(cartRead).toHaveBeenCalledTimes(1);

    // The first focus is the screen opening — the cart's own first read covers it.
    emit('focus');
    expect(cartRead).toHaveBeenCalledTimes(1);

    // The dish's own screen changed the same cart meanwhile.
    cartRead.mockResolvedValue({ chai: 3 });
    couponRead.mockResolvedValue(SAVE20);
    emit('blur');
    emit('focus');

    await waitFor(() => expect(result.current.cart.quantityOf('chai')).toBe(3));
    expect(cartRead).toHaveBeenLastCalledWith('v1');
    expect(couponRead).toHaveBeenLastCalledWith('v1');
    expect(result.current.cart.coupon).toEqual(SAVE20);
  });

  it('takes the kept cart as it is now, even when it was emptied elsewhere', async () => {
    couponRead.mockResolvedValue(SAVE20);
    const { result } = renderHook(() => useFoodOrdering(venue, onRefresh));
    await waitFor(() => expect(result.current.cart.coupon).toEqual(SAVE20));

    cartRead.mockResolvedValue({});
    couponRead.mockResolvedValue(null);
    emit('blur');
    emit('focus');

    await waitFor(() => expect(result.current.cart.lines).toHaveLength(0));
    expect(result.current.cart.coupon).toBeNull();
  });

  it('stops listening once the menu is gone', async () => {
    const { result, unmount } = renderHook(() => useFoodOrdering(venue, onRefresh));
    await waitFor(() => expect(result.current.cart.hydrated).toBe(true));
    unmount();
    expect(mockOff).toHaveBeenCalledTimes(2);
  });
});

describe('useFoodOrdering — the table sticker', () => {
  it('starts the checkout with the table the sticker named, trimmed', async () => {
    mockParams = { venueId: 'v1', table: '  5 ' };
    const { result } = renderHook(() => useFoodOrdering(venue, onRefresh));
    await waitFor(() => expect(result.current.cart.hydrated).toBe(true));
    expect(result.current.guest.table).toBe('5');
  });

  it('leaves the table empty for a menu opened without one', async () => {
    mockParams = undefined;
    const { result } = renderHook(() => useFoodOrdering(venue, onRefresh));
    await waitFor(() => expect(result.current.cart.hydrated).toBe(true));
    expect(result.current.guest.table).toBe('');
  });
});
