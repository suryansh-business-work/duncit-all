import { Text } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import {
  formatFoodMoney,
  type VenueFoodCouponPreview,
  type VenueFoodCouponRejection,
  type VenueFoodOrder,
} from '@duncit/utils';

import { VenueFoodOrderingScope } from '@/components/details/venue-food/VenueFoodOrderingScope';
import type { PublicVenueDetails } from '@/hooks/useHostsVenues';
import { FoodOrderSummary } from '@/screens/VenueFoodOrderScreen/FoodOrderSummary';
import { placeFoodOrder, previewFoodCoupon } from '@/services/food-order';
import {
  readFoodCart,
  readFoodCoupon,
  readFoodGuest,
  writeFoodCoupon,
} from '@/services/food-storage';
import { ApiError } from '@/utils/errors';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, addListener: () => () => undefined }),
  // The menu opened without a table sticker: the checkout starts with no table.
  useRoute: () => ({ params: { venueId: 'v1' } }),
}));
jest.mock('@/hooks/usePublicFinance', () => ({
  usePublicFinance: () => ({ gstPct: 0, currency: '₹' }),
}));
// The venue's payment sheet is a web view; these tests stop where it would open.
jest.mock('@/components/checkout/RazorpayWebView', () => ({ RazorpayWebView: () => null }));
let mockMinted = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: () => {
    mockMinted += 1;
    return `key-${mockMinted}`;
  },
}));
jest.mock('@/services/food-storage', () => ({
  readFoodCart: jest.fn(),
  writeFoodCart: jest.fn(() => Promise.resolve()),
  readFoodCoupon: jest.fn(),
  writeFoodCoupon: jest.fn(() => Promise.resolve()),
  readFoodGuest: jest.fn(),
  writeFoodGuest: jest.fn(() => Promise.resolve()),
  storedFoodOrderKeys: jest.fn(() => Promise.resolve([])),
  saveFoodOrder: jest.fn(() => Promise.resolve()),
}));
// Only the round trips are replaced: the error readers are the real ones.
jest.mock('@/services/food-order', () => ({
  ...jest.requireActual<typeof import('@/services/food-order')>('@/services/food-order'),
  placeFoodOrder: jest.fn(),
  previewFoodCoupon: jest.fn(),
  verifyFoodOrderPayment: jest.fn(),
}));

const preview = jest.mocked(previewFoodCoupon);
const place = jest.mocked(placeFoodOrder);
const storeCoupon = jest.mocked(writeFoodCoupon);

const money = (amount: number) => formatFoodMoney(amount, '₹');

/** Two chai at ₹120 with 10% off QR orders: ₹240, less ₹24, is ₹216 before any coupon. */
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
  food_ordering: { enabled: true, discount_pct: 10 },
} as unknown as PublicVenueDetails;

const accepted = (over: Partial<VenueFoodCouponPreview> = {}): VenueFoodCouponPreview => ({
  ok: true,
  reason: null,
  message: null,
  coupon_code: 'SAVE20',
  coupon_pct: 20,
  min_order_amount: 0,
  subtotal: 240,
  discount_pct: 10,
  discount_amount: 24,
  coupon_discount_amount: 43.2,
  // The venue's GST as the server applies it — none on this venue.
  tax_mode: 'INCLUSIVE',
  gst_pct: 0,
  taxable_amount: 172.8,
  tax_amount: 0,
  total: 172.8,
  currency_symbol: '₹',
  ...over,
});

const refused = (reason: VenueFoodCouponRejection): VenueFoodCouponPreview =>
  accepted({
    ok: false,
    reason,
    message: 'the server said no',
    coupon_code: null,
    coupon_pct: 0,
    coupon_discount_amount: 0,
    taxable_amount: 216,
    total: 216,
  });

/** Opens the cart sheet and waits for the coupon row in the state the test expects. */
async function openCart(row: 'food-coupon-input' | 'food-coupon-applied' = 'food-coupon-input') {
  renderWithProviders(
    <VenueFoodOrderingScope venue={venue} onRefresh={jest.fn()}>
      <Text>menu</Text>
    </VenueFoodOrderingScope>,
  );
  fireEvent.press(await screen.findByTestId('food-cart-bar-open'));
  await screen.findByTestId(row);
}

/** What the nth placement was sent with. */
const placed = (nth: number) => place.mock.calls[nth]?.[0];

async function applyCode(typed = 'save20') {
  fireEvent.changeText(screen.getByTestId('food-coupon-input'), typed);
  fireEvent.press(screen.getByTestId('food-coupon-apply'));
  await waitFor(() => expect(preview).toHaveBeenCalled());
}

const payLabel = () => screen.getByTestId('food-cart-pay').props['aria-label'];

beforeEach(() => {
  jest.clearAllMocks();
  mockMinted = 0;
  jest.mocked(readFoodCart).mockResolvedValue({ chai: 2 });
  jest.mocked(readFoodCoupon).mockResolvedValue(null);
  jest.mocked(readFoodGuest).mockResolvedValue({ name: 'Asha Rao', phone: '9876543210' });
});

describe('the venue coupon on the food cart', () => {
  it('asks the server about the typed code and shows what it takes off', async () => {
    preview.mockResolvedValue(accepted());
    await openCart();
    await waitFor(() => expect(screen.getByTestId('field-phone').props.value).toBe('9876543210'));
    expect(screen.queryByTestId('food-cart-totals-coupon')).toBeNull();
    expect(payLabel()).toBe(`Pay ${money(216)}`);

    await applyCode(' save20 ');

    expect(preview).toHaveBeenCalledWith({
      venue_id: 'v1',
      coupon_code: 'SAVE20',
      items: [{ item_id: 'chai', quantity: 2 }],
      customer_phone: '9876543210',
    });
    expect(await screen.findByTestId('food-cart-totals-coupon')).toHaveTextContent(
      `− ${money(43.2)}`,
    );
    expect(screen.getByText('Coupon SAVE20 (20%)')).toBeOnTheScreen();
    expect(screen.getByTestId('food-cart-totals-discount')).toHaveTextContent(`− ${money(24)}`);
    expect(screen.getByTestId('food-cart-totals-total')).toHaveTextContent(money(172.8));
    expect(payLabel()).toBe(`Pay ${money(172.8)}`);
    const status = screen.getByTestId('food-coupon-status');
    expect(status).toHaveTextContent(`Coupon SAVE20 applied — you save ${money(43.2)}`);
    expect(status.props['aria-live']).toBe('polite');
    expect(screen.getByTestId('food-coupon-remove').props['aria-label']).toBe(
      'Remove coupon SAVE20',
    );
    expect(storeCoupon).toHaveBeenLastCalledWith('v1', {
      code: 'SAVE20',
      coupon_pct: 20,
      min_order_amount: 0,
    });
  });

  it('sends no phone while none is known, and no question for a code too short to be one', async () => {
    jest.mocked(readFoodGuest).mockResolvedValue(null);
    preview.mockResolvedValue(accepted());
    await openCart();

    fireEvent.changeText(screen.getByTestId('food-coupon-input'), 'ab');
    fireEvent.press(screen.getByTestId('food-coupon-apply'));
    expect(preview).not.toHaveBeenCalled();

    await applyCode('abc');
    expect(preview).toHaveBeenCalledWith(
      expect.objectContaining({ coupon_code: 'ABC', customer_phone: null }),
    );
  });

  it.each<[VenueFoodCouponRejection, string]>([
    ['INVALID', 'This coupon code is not valid here.'],
    ['NOT_STARTED', 'This coupon is not active yet.'],
    ['EXPIRED', 'This coupon has expired.'],
    ['MIN_ORDER_NOT_MET', 'Your order is below the minimum for this coupon.'],
    ['USAGE_LIMIT_REACHED', 'This coupon has been fully used.'],
    ['PER_PERSON_LIMIT_REACHED', 'You have already used this coupon as many times as it allows.'],
    ['NO_DISCOUNT', 'This coupon adds nothing to the discount you already have.'],
  ])('says why a %s code was refused and leaves the bill alone', async (reason, sentence) => {
    preview.mockResolvedValue(refused(reason));
    await openCart();
    await applyCode();

    expect(await screen.findByTestId('food-coupon-error')).toHaveTextContent(sentence);
    expect(screen.queryByTestId('food-coupon-applied')).toBeNull();
    expect(screen.queryByTestId('food-cart-totals-coupon')).toBeNull();
    expect(screen.getByTestId('food-cart-totals-total')).toHaveTextContent(money(216));
    expect(storeCoupon).not.toHaveBeenCalledWith('v1', expect.anything());
    // The refusal goes as soon as the code is edited.
    fireEvent.changeText(screen.getByTestId('food-coupon-input'), 'SAVE2');
    expect(screen.queryByTestId('food-coupon-error')).toBeNull();
  });

  it('says the code could not be checked when the request fails', async () => {
    preview.mockRejectedValue(new Error('Network request failed'));
    await openCart();
    await applyCode();

    expect(await screen.findByTestId('food-coupon-error')).toHaveTextContent(
      'We could not check this coupon. Please try again.',
    );
    expect(screen.getByTestId('food-cart-totals-total')).toHaveTextContent(money(216));
    expect(screen.getByTestId('food-coupon-input').props.value).toBe('SAVE20');
  });

  it('puts the bill back when the code is removed', async () => {
    preview.mockResolvedValue(accepted());
    await openCart();
    await applyCode();
    fireEvent.press(await screen.findByTestId('food-coupon-remove'));

    expect(screen.queryByTestId('food-cart-totals-coupon')).toBeNull();
    expect(screen.getByTestId('food-cart-totals-total')).toHaveTextContent(money(216));
    expect(payLabel()).toBe(`Pay ${money(216)}`);
    expect(screen.getByTestId('food-coupon-removed')).toHaveTextContent('Coupon removed');
    expect(screen.getByTestId('food-coupon-input').props.value).toBe('');
    await waitFor(() => expect(storeCoupon).toHaveBeenLastCalledWith('v1', null));
  });

  it('re-prices on its own when the cart falls under the minimum, and orders without the code', async () => {
    preview.mockResolvedValue(accepted({ min_order_amount: 200 }));
    place.mockRejectedValue(new Error('offline'));
    await openCart();
    await applyCode();
    await screen.findByTestId('food-cart-totals-coupon');

    fireEvent.press(screen.getByTestId('food-cart-stepper-chai-decrease'));

    // One chai is ₹120: ₹80 short of the code's ₹200, so only the venue's 10% comes off.
    expect(screen.getByTestId('food-coupon-status')).toHaveTextContent(
      `Add ${money(80)} more to use this coupon.`,
    );
    expect(screen.queryByTestId('food-cart-totals-coupon')).toBeNull();
    expect(screen.getByTestId('food-cart-totals-total')).toHaveTextContent(money(108));
    expect(preview).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId('food-cart-pay'));
    await waitFor(() => expect(place).toHaveBeenCalledTimes(1));
    expect(placed(0)).not.toHaveProperty('coupon_code');

    // Back over the minimum, the same code counts again — still without asking.
    fireEvent.press(screen.getByTestId('food-cart-stepper-chai-increase'));
    expect(screen.getByTestId('food-cart-totals-coupon')).toHaveTextContent(`− ${money(43.2)}`);
    expect(preview).toHaveBeenCalledTimes(1);
  });

  it('places with the code, under a key of its own', async () => {
    preview.mockResolvedValue(accepted());
    place.mockRejectedValue(new Error('offline'));
    await openCart();
    await applyCode();
    await screen.findByTestId('food-coupon-applied');

    fireEvent.press(screen.getByTestId('food-cart-pay'));
    await waitFor(() => expect(place).toHaveBeenCalledTimes(1));
    await screen.findByTestId('food-cart-error');
    // The same cart, details and code again is the same attempt.
    fireEvent.press(screen.getByTestId('food-cart-pay'));
    await waitFor(() => expect(place).toHaveBeenCalledTimes(2));
    await screen.findByTestId('food-cart-error');

    fireEvent.press(screen.getByTestId('food-coupon-remove'));
    fireEvent.press(screen.getByTestId('food-cart-pay'));
    await waitFor(() => expect(place).toHaveBeenCalledTimes(3));

    const withCode = placed(0);
    const without = placed(2);
    expect(withCode).toMatchObject({ venue_id: 'v1', coupon_code: 'SAVE20' });
    expect(withCode?.client_key).toEqual(expect.any(String));
    expect(placed(1)?.client_key).toBe(withCode?.client_key);
    expect(without).not.toHaveProperty('coupon_code');
    expect(without?.client_key).toEqual(expect.any(String));
    expect(without?.client_key).not.toBe(withCode?.client_key);
    expect(without?.items).toEqual([{ item_id: 'chai', quantity: 2 }]);
  });

  it('keeps the cart when the order is refused over its coupon, and lets the code go', async () => {
    preview.mockResolvedValue(accepted());
    place.mockRejectedValueOnce(
      new ApiError('Coupon expired', 200, { code: 'FOOD_COUPON_REJECTED', reason: 'EXPIRED' }),
    );
    await openCart();
    await applyCode();
    await screen.findByTestId('food-coupon-applied');
    fireEvent.press(screen.getByTestId('food-cart-pay'));

    const notice = await screen.findByTestId('food-cart-error');
    expect(notice).toHaveTextContent(
      /This coupon can no longer be used\. Remove it or try another code\./,
    );
    expect(notice).toHaveTextContent(/This coupon has expired\./);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByTestId('food-cart-line-chai')).toBeOnTheScreen();
    // Still the price that was refused — it only changes when the member removes the code.
    expect(payLabel()).toBe(`Pay ${money(172.8)}`);

    fireEvent.press(screen.getByTestId('food-coupon-remove'));
    expect(screen.queryByTestId('food-cart-error')).toBeNull();
    expect(payLabel()).toBe(`Pay ${money(216)}`);

    place.mockResolvedValueOnce({
      order: { id: 'o1', venue_id: 'v1', order_no: 'F-1' } as VenueFoodOrder,
      access_key: 'ak',
      razorpay: null,
    });
    fireEvent.press(screen.getByTestId('food-cart-pay'));
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('VenueFoodOrder', {
        venueId: 'v1',
        orderId: 'o1',
        key: 'ak',
      }),
    );
    expect(placed(1)).not.toHaveProperty('coupon_code');
  });

  it('comes back with the cart it was applied to, and goes when the order is placed', async () => {
    jest
      .mocked(readFoodCoupon)
      .mockResolvedValue({ code: 'SAVE20', coupon_pct: 20, min_order_amount: 0 });
    preview.mockResolvedValue(accepted());
    place.mockResolvedValue({
      order: { id: 'o1', venue_id: 'v1', order_no: 'F-1' } as VenueFoodOrder,
      access_key: 'ak',
      razorpay: null,
    });
    await openCart('food-coupon-applied');

    expect(screen.getByTestId('food-cart-totals-coupon')).toHaveTextContent(`− ${money(43.2)}`);
    expect(preview).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('field-phone').props.value).toBe('9876543210'));

    fireEvent.press(screen.getByTestId('food-cart-pay'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(placed(0)).toMatchObject({ coupon_code: 'SAVE20' });
    await waitFor(() => expect(storeCoupon).toHaveBeenLastCalledWith('v1', null));
  });

  describe('checked again at Pay', () => {
    const kept = { code: 'SAVE20', coupon_pct: 20, min_order_amount: 0 };
    const order = {
      order: { id: 'o1', venue_id: 'v1', order_no: 'F-1' } as VenueFoodOrder,
      access_key: 'ak',
      razorpay: null,
    };

    async function openKeptCart() {
      jest.mocked(readFoodCoupon).mockResolvedValue(kept);
      await openCart('food-coupon-applied');
      await waitFor(() => expect(screen.getByTestId('field-phone').props.value).toBe('9876543210'));
    }

    it('asks with the mobile typed and, on the same terms, places once with the code', async () => {
      preview.mockResolvedValue(accepted());
      place.mockResolvedValue(order);
      await openKeptCart();
      fireEvent.changeText(screen.getByTestId('field-phone'), '9123456780');

      // Two taps in one frame: the second finds the first still checking.
      fireEvent.press(screen.getByTestId('food-cart-pay'));
      fireEvent.press(screen.getByTestId('food-cart-pay'));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
      expect(preview).toHaveBeenCalledTimes(1);
      expect(preview).toHaveBeenCalledWith({
        venue_id: 'v1',
        coupon_code: 'SAVE20',
        items: [{ item_id: 'chai', quantity: 2 }],
        customer_phone: '9123456780',
      });
      expect(place).toHaveBeenCalledTimes(1);
      expect(placed(0)).toMatchObject({ coupon_code: 'SAVE20', customer_phone: '9123456780' });
    });

    it('shows the new price instead of charging it when the venue changed the code, and places on the next Pay', async () => {
      // The venue cut the code to 10% since it was applied: ₹216 less ₹21.60.
      preview.mockResolvedValue(accepted({ coupon_pct: 10 }));
      place.mockResolvedValue(order);
      await openKeptCart();
      expect(payLabel()).toBe(`Pay ${money(172.8)}`);

      fireEvent.press(screen.getByTestId('food-cart-pay'));

      await waitFor(() => expect(payLabel()).toBe(`Pay ${money(194.4)}`));
      expect(screen.getByTestId('food-cart-totals-coupon')).toHaveTextContent(`− ${money(21.6)}`);
      expect(screen.getByText('Coupon SAVE20 (10%)')).toBeOnTheScreen();
      expect(place).not.toHaveBeenCalled();
      expect(screen.queryByTestId('food-cart-error')).toBeNull();
      expect(storeCoupon).toHaveBeenLastCalledWith('v1', { ...kept, coupon_pct: 10 });

      fireEvent.press(screen.getByTestId('food-cart-pay'));
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
      expect(preview).toHaveBeenCalledTimes(2);
      expect(place).toHaveBeenCalledTimes(1);
      expect(placed(0)).toMatchObject({ coupon_code: 'SAVE20' });
    });

    it('places nothing when the check finds the code used up for this number', async () => {
      preview.mockResolvedValue(refused('PER_PERSON_LIMIT_REACHED'));
      await openKeptCart();
      fireEvent.press(screen.getByTestId('food-cart-pay'));

      const notice = await screen.findByTestId('food-cart-error');
      expect(notice).toHaveTextContent(
        /You have already used this coupon as many times as it allows\./,
      );
      expect(notice).toHaveTextContent(
        /This coupon can no longer be used\. Remove it or try another code\./,
      );
      expect(place).not.toHaveBeenCalled();
      expect(screen.getByTestId('food-cart-line-chai')).toBeOnTheScreen();
      expect(screen.getByTestId('food-coupon-code')).toHaveTextContent('SAVE20');
      expect(payLabel()).toBe(`Pay ${money(172.8)}`);
    });

    it('places nothing when the check itself does not come back', async () => {
      preview.mockRejectedValue(new Error('Network request failed'));
      await openKeptCart();
      fireEvent.press(screen.getByTestId('food-cart-pay'));

      expect(await screen.findByTestId('food-cart-error')).toHaveTextContent(
        /We could not check this coupon. Please try again./,
      );
      expect(place).not.toHaveBeenCalled();
      expect(screen.getByTestId('food-coupon-code')).toHaveTextContent('SAVE20');
    });

    it('leaves a closed venue to the placement, which already answers it', async () => {
      preview.mockRejectedValue(new ApiError('Closed', 200, { code: 'FOOD_ORDERING_CLOSED' }));
      place.mockRejectedValue(new ApiError('Closed', 200, { code: 'FOOD_ORDERING_CLOSED' }));
      await openKeptCart();
      fireEvent.press(screen.getByTestId('food-cart-pay'));

      await waitFor(() => expect(place).toHaveBeenCalledTimes(1));
      expect(placed(0)).toMatchObject({ coupon_code: 'SAVE20' });
      // The cart goes with the venue's ordering; the menu stays.
      await waitFor(() => expect(screen.queryByTestId('food-cart-bar')).toBeNull());
    });
  });

  it('goes with the last dish taken out of the cart', async () => {
    jest
      .mocked(readFoodCoupon)
      .mockResolvedValue({ code: 'SAVE20', coupon_pct: 20, min_order_amount: 0 });
    await openCart('food-coupon-applied');

    fireEvent.press(screen.getByTestId('food-cart-remove-chai'));
    await waitFor(() => expect(storeCoupon).toHaveBeenLastCalledWith('v1', null));
  });
});

describe('the coupon on a placed order', () => {
  const order = (over: Partial<VenueFoodOrder> = {}): VenueFoodOrder => ({
    id: 'o1',
    order_no: 'F-1',
    venue_id: 'v1',
    venue_name: 'Cafe',
    customer_name: 'Asha Rao',
    customer_phone: '9876543210',
    table_label: '',
    note: '',
    items: [
      {
        item_id: 'chai',
        name: 'Masala Chai',
        diet: 'VEG',
        unit_price: 120,
        quantity: 2,
        line_total: 240,
      },
    ],
    subtotal: 240,
    discount_pct: 10,
    discount_amount: 24,
    coupon_code: null,
    coupon_pct: 0,
    coupon_discount_amount: 0,
    total: 216,
    currency_symbol: '₹',
    status: 'PLACED',
    payment_status: 'PAID',
    paid_at: null,
    cancelled_at: null,
    cancel_reason: '',
    created_at: '2026-10-13T10:00:00.000Z',
    ...over,
  });

  it('has its own line between the discount and the total', () => {
    renderWithProviders(
      <FoodOrderSummary
        order={order({
          coupon_code: 'SAVE20',
          coupon_pct: 20,
          coupon_discount_amount: 43.2,
          total: 172.8,
        })}
      />,
    );
    expect(screen.getByText('Coupon SAVE20 (20%)')).toBeOnTheScreen();
    expect(screen.getByTestId('food-order-totals-coupon')).toHaveTextContent(`− ${money(43.2)}`);
    expect(screen.getByTestId('food-order-totals-total')).toHaveTextContent(money(172.8));
  });

  it('is left out of an order placed without one', () => {
    renderWithProviders(<FoodOrderSummary order={order()} />);
    expect(screen.queryByTestId('food-order-totals-coupon')).toBeNull();
    expect(screen.getByTestId('food-order-totals-total')).toHaveTextContent(money(216));
  });
});
