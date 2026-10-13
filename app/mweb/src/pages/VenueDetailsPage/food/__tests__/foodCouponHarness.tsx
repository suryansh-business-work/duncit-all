import { fireEvent, render, screen } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import type { PlaceVenueFoodOrderInput, PreviewVenueFoodCouponInput, VenueFoodCouponPreview, VenueFoodItem } from '@duncit/utils';
import type { PublicVenue } from '../../queries';
import { PLACE_VENUE_FOOD_ORDER, PREVIEW_VENUE_FOOD_COUPON } from '../queries';
import VenueFoodMenu from '../VenueFoodMenu';

const dish = (id: string, name: string, price: number): VenueFoodItem => ({
  id,
  name,
  description: '',
  category: 'Menu',
  price,
  images: [],
  diet: 'VEG',
  spice_level: 'NONE',
  is_available: true,
});

const VENUE = {
  id: 'v1',
  venue_name: 'Grand Hall',
  offers_food: true,
  food_menu: [dish('chai', 'Masala Chai', 40), dish('samosa', 'Samosa', 25)],
  food_ordering: { enabled: true, discount_pct: 0 },
} as PublicVenue;

export const CART_KEY = 'mweb_food_cart_v1';
export const COUPON_KEY = 'mweb_food_coupon_v1';
/** Ten percent off, on a subtotal of 150 or more. */
export const SAVE10 = { coupon_code: 'SAVE10', coupon_pct: 10, min_order_amount: 150 };

/** Five chai — a subtotal of 200. */
export const seedCart = (cart: Record<string, number> = { chai: 5 }) => localStorage.setItem(CART_KEY, JSON.stringify(cart));
export const seedCoupon = () => localStorage.setItem(COUPON_KEY, JSON.stringify(SAVE10));
export const seedGuest = () => localStorage.setItem('mweb_food_guest', JSON.stringify({ name: 'Asha', phone: '9876543210' }));

/** The server's answer for SAVE10 on the 200 cart; `over` turns it into any other answer. */
export const previewOf = (over: Partial<VenueFoodCouponPreview> = {}): VenueFoodCouponPreview => ({
  ok: true,
  reason: null,
  message: null,
  ...SAVE10,
  subtotal: 200,
  discount_pct: 0,
  discount_amount: 0,
  coupon_discount_amount: 20,
  total: 180,
  currency_symbol: '₹',
  ...over,
});

export const refusedPreview = (reason: VenueFoodCouponPreview['reason']) =>
  previewOf({ ok: false, reason, message: 'refused', coupon_code: null, coupon_discount_amount: 0, total: 200 });

/** One preview call: records what was asked, and answers with `answer` (or fails like a dropped connection). */
export function previewMock(asked: PreviewVenueFoodCouponInput[], answer: VenueFoodCouponPreview | Error): MockedResponse {
  const request = {
    query: PREVIEW_VENUE_FOOD_COUPON,
    variables: (vars: { input: PreviewVenueFoodCouponInput }) => {
      asked.push(vars.input);
      return true;
    },
  };
  return answer instanceof Error
    ? { request, error: answer }
    : { request, result: { data: { previewVenueFoodCoupon: answer } } };
}

/** One place call: records the input it was sent, and answers with `answer`. */
export function placeMock(sent: PlaceVenueFoodOrderInput[], answer: MockedResponse['result']): MockedResponse {
  return {
    request: {
      query: PLACE_VENUE_FOOD_ORDER,
      variables: (vars: { input: PlaceVenueFoodOrderInput }) => {
        sent.push(vars.input);
        return true;
      },
    },
    result: answer,
  };
}

/** The menu with its cart sheet open. Finance settings go unanswered, so amounts are in the default rupee. */
export function renderCart(mocks: MockedResponse[], venue: Partial<PublicVenue> = {}) {
  const view = render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter>
        <VenueFoodMenu venue={{ ...VENUE, ...venue }} onRefresh={vi.fn(() => Promise.resolve())} />
      </MemoryRouter>
    </MockedProvider>,
  );
  fireEvent.click(screen.getByTestId('food-cart-bar-open'));
  return view;
}

export const codeField = () => screen.getByTestId('field-coupon-code');
export const message = () => screen.getByTestId('food-coupon-message');

/** Type a code and press Enter in the field. */
export function applyCode(code: string) {
  fireEvent.change(codeField(), { target: { value: code } });
  fireEvent.submit(screen.getByTestId('food-coupon-form'));
}
