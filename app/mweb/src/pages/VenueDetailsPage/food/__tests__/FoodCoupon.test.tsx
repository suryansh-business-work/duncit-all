import '@testing-library/jest-dom/vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PreviewVenueFoodCouponInput, VenueFoodCouponRejection } from '@duncit/utils';
import {
  CART_KEY,
  COUPON_KEY,
  SAVE10,
  applyCode,
  codeField,
  message,
  previewMock,
  previewOf,
  refusedPreview,
  renderCart,
  seedCart,
  seedCoupon,
  seedGuest,
} from './foodCouponHarness';

const total = () => screen.getByTestId('food-cart-totals-total');
const couponLine = () => screen.queryByTestId('food-cart-totals-coupon');
const storedCoupon = () => JSON.parse(localStorage.getItem(COUPON_KEY) ?? 'null');

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('the venue coupon on the food cart — applying a code', () => {
  it('asks the server about the code as typed, then prices the cart with it', async () => {
    seedCart();
    const asked: PreviewVenueFoodCouponInput[] = [];
    renderCart([previewMock(asked, previewOf())]);
    expect(total()).toHaveTextContent('₹200');

    applyCode(' save10 ');
    expect(await screen.findByTestId('food-coupon-code')).toHaveTextContent('SAVE10');
    expect(asked).toEqual([
      { venue_id: 'v1', coupon_code: 'SAVE10', items: [{ item_id: 'chai', quantity: 5 }], customer_phone: null },
    ]);
    expect(screen.getByText('Coupon SAVE10 (10%)')).toBeInTheDocument();
    expect(couponLine()).toHaveTextContent('− ₹20');
    expect(total()).toHaveTextContent('₹180');
    // The button charges what the bill above it says.
    expect(screen.getByTestId('food-cart-pay')).toHaveTextContent('Pay ₹180');
    expect(screen.getByTestId('food-cart-bar-total')).toHaveTextContent('₹180');
    expect(message()).toHaveTextContent('Coupon SAVE10 applied — you save ₹20');
    expect(message()).toHaveAttribute('aria-live', 'polite');
    // Kept with the cart by an effect, so it lands after the render that shows the code.
    // The coverage run is several times slower than a local one, so the effect gets more than the default second.
    await waitFor(() => expect(storedCoupon()).toEqual(SAVE10), { timeout: 5000 });
    // The field gave way to the code; focus went to the control that replaced it.
    expect(screen.getByRole('button', { name: 'Remove coupon SAVE10' })).toHaveFocus();
  });

  it('sends the mobile number the device already knows, so a per-person limit shows early', async () => {
    seedCart();
    seedGuest();
    const asked: PreviewVenueFoodCouponInput[] = [];
    renderCart([previewMock(asked, previewOf())]);
    applyCode('SAVE10');
    await screen.findByTestId('food-coupon-code');
    expect(asked[0].customer_phone).toBe('9876543210');
  });

  it.each<[VenueFoodCouponRejection, string]>([
    ['INVALID', 'This coupon code is not valid here.'],
    ['NOT_STARTED', 'This coupon is not active yet.'],
    ['EXPIRED', 'This coupon has expired.'],
    ['MIN_ORDER_NOT_MET', 'Your order is below the minimum for this coupon.'],
    ['USAGE_LIMIT_REACHED', 'This coupon has been fully used.'],
    ['PER_PERSON_LIMIT_REACHED', 'You have already used this coupon as many times as it allows.'],
    ['NO_DISCOUNT', 'This coupon adds nothing to the discount you already have.'],
  ])('says why a %s code was refused, on the field, and leaves the bill alone', async (reason, sentence) => {
    seedCart();
    renderCart([previewMock([], refusedPreview(reason))]);
    applyCode('SAVE10');

    await waitFor(() => expect(message()).toHaveTextContent(sentence));
    expect(codeField()).toHaveAttribute('aria-invalid', 'true');
    expect(codeField()).toHaveAttribute('aria-describedby', message().id);
    expect(codeField()).toHaveValue('SAVE10');
    expect(screen.queryByTestId('food-coupon-code')).not.toBeInTheDocument();
    expect(couponLine()).not.toBeInTheDocument();
    expect(total()).toHaveTextContent('₹200');
    expect(storedCoupon()).toBeNull();
  });

  it('says the check failed when the answer never arrives, without calling the code wrong', async () => {
    seedCart();
    renderCart([previewMock([], new Error('Failed to fetch'))]);
    applyCode('SAVE10');

    await waitFor(() => expect(message()).toHaveTextContent('We could not check this coupon. Please try again.'));
    expect(codeField()).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByTestId('food-coupon-apply')).toBeEnabled();
    expect(total()).toHaveTextContent('₹200');
  });

  it('does not ask the server about a code shorter than any code can be', async () => {
    seedCart();
    const asked: PreviewVenueFoodCouponInput[] = [];
    renderCart([previewMock(asked, previewOf())]);
    applyCode('AB');

    await waitFor(() => expect(message()).toHaveTextContent('This coupon code is not valid here.'));
    expect(codeField()).toHaveAttribute('aria-invalid', 'true');
    expect(asked).toEqual([]);
  });
});

describe('the venue coupon on the food cart — an applied code', () => {
  it('comes back with the cart on the next visit, priced without asking the server', () => {
    seedCart();
    seedCoupon();
    renderCart([]);
    expect(screen.getByTestId('food-coupon-code')).toHaveTextContent('SAVE10');
    expect(couponLine()).toHaveTextContent('− ₹20');
    expect(total()).toHaveTextContent('₹180');
  });

  it('takes the venue discount off first and the coupon off what is left', () => {
    seedCart();
    seedCoupon();
    renderCart([], { food_ordering: { enabled: true, discount_pct: 10 } });
    expect(screen.getByTestId('food-cart-totals-discount')).toHaveTextContent('− ₹20');
    expect(couponLine()).toHaveTextContent('− ₹18');
    expect(total()).toHaveTextContent('₹162');
  });

  it('restores the full price when the code is removed', () => {
    seedCart();
    seedCoupon();
    renderCart([]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove coupon SAVE10' }));

    expect(couponLine()).not.toBeInTheDocument();
    expect(total()).toHaveTextContent('₹200');
    expect(screen.getByTestId('food-cart-pay')).toHaveTextContent('Pay ₹200');
    expect(message()).toHaveTextContent('Coupon removed');
    expect(localStorage.getItem(COUPON_KEY)).toBeNull();
    expect(codeField()).toHaveValue('');
    expect(codeField()).toHaveFocus();
  });

  it('stops saving, and says how much more is needed, once the cart drops under the minimum', () => {
    seedCart();
    seedCoupon();
    // No preview is mocked: a quantity tap that asked the server would have nothing to answer it.
    renderCart([]);
    const less = screen.getAllByRole('button', { name: 'Remove one Masala Chai' })[0];
    fireEvent.click(less);
    expect(couponLine()).toHaveTextContent('− ₹16');
    expect(total()).toHaveTextContent('₹144');

    fireEvent.click(less);
    expect(couponLine()).not.toBeInTheDocument();
    expect(total()).toHaveTextContent('₹120');
    expect(message()).toHaveTextContent('Add ₹30 more to use this coupon.');
    expect(screen.getByTestId('food-cart-pay')).toHaveTextContent('Pay ₹120');

    fireEvent.click(screen.getAllByRole('button', { name: 'Add one more Masala Chai' })[0]);
    expect(couponLine()).toHaveTextContent('− ₹16');
    expect(message()).toHaveTextContent('Coupon SAVE10 applied — you save ₹16');
  });

  it('goes with the cart when the last dish is taken out', () => {
    seedCart({ samosa: 1 });
    seedCoupon();
    renderCart([]);
    fireEvent.click(screen.getByTestId('food-cart-remove-samosa'));
    expect(localStorage.getItem(COUPON_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(CART_KEY) ?? '{}')).toEqual({});
  });
});
