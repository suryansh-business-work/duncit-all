import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  PlaceVenueFoodOrderInput,
  PreviewVenueFoodCouponInput,
  VenueFoodOrder,
  VenueFoodOrderPlacement,
} from '@duncit/utils';
import FoodOrderSummary from '../../../venue-food-order-page/FoodOrderSummary';
import {
  CART_KEY,
  COUPON_KEY,
  placeMock,
  previewMock,
  previewOf,
  refusedPreview,
  renderCart,
  seedCart,
  seedCoupon,
  seedGuest,
} from './foodCouponHarness';

const order = (over: Partial<VenueFoodOrder> = {}): VenueFoodOrder => ({
  id: 'o1',
  order_no: 'FOOD-1',
  venue_id: 'v1',
  venue_name: 'Grand Hall',
  customer_name: 'Asha',
  customer_phone: '9876543210',
  table_label: '',
  note: '',
  items: [{ item_id: 'chai', name: 'Masala Chai', diet: 'VEG', unit_price: 40, quantity: 5, line_total: 200 }],
  subtotal: 200,
  discount_pct: 0,
  discount_amount: 0,
  coupon_code: null,
  coupon_pct: 0,
  coupon_discount_amount: 0,
  total: 200,
  currency_symbol: '₹',
  status: 'PLACED',
  payment_status: 'PAID',
  paid_at: '2026-10-13T10:00:00.000Z',
  cancelled_at: null,
  cancel_reason: '',
  created_at: '2026-10-13T10:00:00.000Z',
  ...over,
});

// No Razorpay sheet to open: the order is already settled, so the checkout finishes on the answer.
const placed = (): { data: { placeVenueFoodOrder: VenueFoodOrderPlacement } } => ({
  data: { placeVenueFoodOrder: { order: order(), access_key: 'key-1', razorpay: null } },
});
const couponRefused = (reason: string) => ({
  errors: [{ message: 'Coupon refused', extensions: { code: 'FOOD_COUPON_REJECTED', reason } }],
});

const pay = () => fireEvent.submit(screen.getByTestId('food-checkout-form'));
const cartError = () => screen.findByTestId('food-cart-error');
const storedCart = () => JSON.parse(localStorage.getItem(CART_KEY) ?? '{}');

beforeEach(() => {
  localStorage.clear();
  seedCart();
  seedCoupon();
  seedGuest();
});
afterEach(() => localStorage.clear());

describe('the venue coupon on the food cart — paying with a code', () => {
  it('checks the code again with the mobile typed, then places the order with it', async () => {
    const asked: PreviewVenueFoodCouponInput[] = [];
    const sent: PlaceVenueFoodOrderInput[] = [];
    renderCart([previewMock(asked, previewOf()), placeMock(sent, placed())]);
    pay();

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(asked).toEqual([
      { venue_id: 'v1', coupon_code: 'SAVE10', items: [{ item_id: 'chai', quantity: 5 }], customer_phone: '9876543210' },
    ]);
    expect(sent[0]).toMatchObject({ venue_id: 'v1', coupon_code: 'SAVE10', customer_phone: '9876543210' });
    // Placed: the cart and its coupon are both spent.
    await waitFor(() => expect(storedCart()).toEqual({}));
    expect(localStorage.getItem(COUPON_KEY)).toBeNull();
  });

  it('keeps the cart when the server refuses the code on placing, and pays in full under a new key once it is removed', async () => {
    const sent: PlaceVenueFoodOrderInput[] = [];
    renderCart([previewMock([], previewOf()), placeMock(sent, couponRefused('EXPIRED')), placeMock(sent, placed())]);
    pay();

    const alert = within(await cartError());
    expect(alert.getByText('This coupon has expired.')).toBeInTheDocument();
    expect(alert.getByText('This coupon can no longer be used. Remove it or try another code.')).toBeInTheDocument();
    expect(screen.getByTestId('food-coupon-message')).toHaveTextContent('This coupon has expired.');
    expect(screen.getByTestId('food-cart-line-chai')).toBeInTheDocument();
    expect(storedCart()).toEqual({ chai: 5 });
    // Still the price that was quoted — nothing was placed at another one.
    expect(screen.getByTestId('food-cart-pay')).toHaveTextContent('Pay ₹180');

    fireEvent.click(screen.getByRole('button', { name: 'Remove coupon SAVE10' }));
    expect(screen.queryByTestId('food-cart-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('food-cart-pay')).toHaveTextContent('Pay ₹200');
    pay();

    await waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[0].coupon_code).toBe('SAVE10');
    expect(sent[1]).not.toHaveProperty('coupon_code');
    // Removing the code is a new attempt: the server must not answer with the couponed order.
    expect(sent[1].client_key).not.toBe(sent[0].client_key);
    expect(sent[1].client_key).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('places nothing when the check at Pay finds the code used up for this number', async () => {
    const sent: PlaceVenueFoodOrderInput[] = [];
    renderCart([previewMock([], refusedPreview('PER_PERSON_LIMIT_REACHED')), placeMock(sent, placed())]);
    pay();

    const alert = within(await cartError());
    expect(alert.getByText('You have already used this coupon as many times as it allows.')).toBeInTheDocument();
    expect(alert.getByText('This coupon can no longer be used. Remove it or try another code.')).toBeInTheDocument();
    expect(sent).toEqual([]);
    expect(storedCart()).toEqual({ chai: 5 });
    expect(screen.getByTestId('food-cart-pay')).toBeEnabled();
  });

  it('shows the new price instead of charging it when the venue changed the code since it was applied', async () => {
    const sent: PlaceVenueFoodOrderInput[] = [];
    const halved = previewOf({ coupon_pct: 5, coupon_discount_amount: 10, total: 190 });
    renderCart([previewMock([], halved), placeMock(sent, placed())]);
    pay();

    expect(await screen.findByText('Coupon SAVE10 (5%)')).toBeInTheDocument();
    expect(screen.getByTestId('food-cart-pay')).toHaveTextContent('Pay ₹190');
    expect(sent).toEqual([]);
  });

  it('leaves off a code the cart no longer earns, placing at the full price shown', async () => {
    localStorage.setItem(CART_KEY, JSON.stringify({ chai: 3 }));
    const sent: PlaceVenueFoodOrderInput[] = [];
    // No preview mocked: there is nothing to confirm about a code that is not being used.
    renderCart([placeMock(sent, placed())]);
    expect(screen.getByTestId('food-cart-pay')).toHaveTextContent('Pay ₹120');
    pay();

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).not.toHaveProperty('coupon_code');
  });
});

describe('the placed food order — its coupon', () => {
  const renderSummary = (placedOrder: VenueFoodOrder) =>
    render(
      <MockedProvider mocks={[]}>
        <FoodOrderSummary order={placedOrder} />
      </MockedProvider>,
    );

  it('shows the coupon between the discount and the total, as the server priced it', () => {
    renderSummary(order({ coupon_code: 'SAVE10', coupon_pct: 10, coupon_discount_amount: 20, total: 180 }));
    expect(screen.getByText('Coupon SAVE10 (10%)')).toBeInTheDocument();
    expect(screen.getByTestId('food-order-totals-coupon')).toHaveTextContent('− ₹20');
    expect(screen.getByTestId('food-order-totals-total')).toHaveTextContent('₹180');
  });

  it('has no coupon line on an order placed without one', () => {
    renderSummary(order());
    expect(screen.queryByTestId('food-order-totals-coupon')).not.toBeInTheDocument();
    expect(screen.getByTestId('food-order-totals-total')).toHaveTextContent('₹200');
  });
});
