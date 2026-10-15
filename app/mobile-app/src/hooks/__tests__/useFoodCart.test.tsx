import { act, renderHook, waitFor } from '@testing-library/react-native';
import { FOOD_ORDER_LIMITS, type VenueFoodItem } from '@duncit/utils';

import { useFoodCart } from '@/hooks/useFoodCart';
import {
  readFoodCart,
  readFoodCoupon,
  writeFoodCart,
  writeFoodCoupon,
} from '@/services/food-storage';

jest.mock('@/services/food-storage', () => ({
  readFoodCart: jest.fn(),
  readFoodCoupon: jest.fn(),
  writeFoodCart: jest.fn(),
  writeFoodCoupon: jest.fn(),
}));

const dish = (id: string, over: Partial<VenueFoodItem> = {}): VenueFoodItem => ({
  id,
  name: `Dish ${id}`,
  description: '',
  category: 'Mains',
  price: 100,
  images: [],
  diet: 'VEG',
  spice_level: 'NONE',
  is_available: true,
  ...over,
});

const DOSA = dish('d1', { name: 'Masala Dosa' });
const COFFEE = dish('d2', { name: 'Filter Coffee' });
const MENU = [DOSA, COFFEE];
const FULL_MENU = Array.from({ length: FOOD_ORDER_LIMITS.maxLines + 1 }, (_, i) => dish(`f${i}`));
const fullCart = Object.fromEntries(
  FULL_MENU.slice(0, FOOD_ORDER_LIMITS.maxLines).map((item) => [item.id, 1]),
);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(readFoodCart).mockResolvedValue({});
  jest.mocked(readFoodCoupon).mockResolvedValue(null);
  jest.mocked(writeFoodCart).mockResolvedValue(undefined);
  jest.mocked(writeFoodCoupon).mockResolvedValue(undefined);
});

describe('useFoodCart', () => {
  it('drops a stored dish that went unavailable, names it, and keeps the rest', async () => {
    jest.mocked(readFoodCart).mockResolvedValue({ d1: 2, d2: 1 });
    const menu = [DOSA, { ...COFFEE, is_available: false }];
    const { result } = renderHook(() => useFoodCart('v1', menu, 0));

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await waitFor(() => expect(result.current.dropped).toEqual(['Filter Coffee']));
    expect(result.current.quantityOf('d1')).toBe(2);
    expect(result.current.quantityOf('d2')).toBe(0);
    expect(result.current.lines).toHaveLength(1);
    expect(writeFoodCart).toHaveBeenLastCalledWith('v1', { d1: 2 });

    act(() => result.current.dismissDropped());
    expect(result.current.dropped).toEqual([]);
  });

  it('refuses a new line once the order holds the most dishes it may', async () => {
    jest.mocked(readFoodCart).mockResolvedValue(fullCart);
    const { result } = renderHook(() => useFoodCart('v1', FULL_MENU, 0));
    await waitFor(() => expect(result.current.lines).toHaveLength(FOOD_ORDER_LIMITS.maxLines));

    const extra = `f${FOOD_ORDER_LIMITS.maxLines}`;
    act(() => result.current.setQuantity(extra, 1));
    expect(result.current.atMaxLines).toBe(true);
    expect(result.current.quantityOf(extra)).toBe(0);

    // A dish already in the cart can still change.
    act(() => result.current.setQuantity('f0', 3));
    expect(result.current.atMaxLines).toBe(false);
    expect(result.current.quantityOf('f0')).toBe(3);

    act(() => result.current.setQuantity(extra, 1));
    act(() => result.current.dismissMaxLines());
    expect(result.current.atMaxLines).toBe(false);
  });

  it('caps a quantity at the most allowed and removes a dish set to zero', async () => {
    const { result } = renderHook(() => useFoodCart('v1', MENU, 0));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.setQuantity('d1', FOOD_ORDER_LIMITS.maxQuantity + 5));
    expect(result.current.quantityOf('d1')).toBe(FOOD_ORDER_LIMITS.maxQuantity);

    act(() => result.current.setQuantity('d1', 0));
    expect(result.current.quantityOf('d1')).toBe(0);
    expect(result.current.lines).toEqual([]);
  });

  it('writes nothing when the stored cart arrives after the screen has gone', async () => {
    let resolveCart: (cart: Record<string, number>) => void = () => undefined;
    jest.mocked(readFoodCart).mockReturnValue(
      new Promise((resolve) => {
        resolveCart = resolve;
      }),
    );
    const { result, unmount } = renderHook(() => useFoodCart('v1', MENU, 0));
    unmount();

    await act(async () => {
      resolveCart({ d1: 1 });
    });
    expect(result.current.hydrated).toBe(false);
    expect(writeFoodCart).not.toHaveBeenCalled();
  });

  it('reads the stored cart and coupon again on reload', async () => {
    const { result } = renderHook(() => useFoodCart('v1', MENU, 0));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    const coupon = { code: 'DOSA10', coupon_pct: 10, min_order_amount: 0 };
    jest.mocked(readFoodCart).mockResolvedValue({ d2: 2 });
    jest.mocked(readFoodCoupon).mockResolvedValue(coupon);

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.quantityOf('d2')).toBe(2));
    expect(result.current.coupon).toEqual(coupon);
  });
});
