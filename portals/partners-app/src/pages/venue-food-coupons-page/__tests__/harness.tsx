import '../../../../__tests__/helpers/agGridEnv';
import '../../../__tests__/groupC-wide-grid';
import { fireEvent, screen } from '@testing-library/react';
import VenueFoodCouponsPage from '../VenueFoodCouponsPage';
import { renderWithProviders } from '../../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../../__tests__/groupC-link';

type Over = Record<string, unknown>;

/** One food coupon with every field the coupon documents select. */
export const couponRow = (over: Over = {}) => ({
  __typename: 'VenueFoodCoupon',
  id: 'c1',
  code: 'WELCOME10',
  description: 'First visit',
  discount_pct: 10,
  min_order_amount: 200,
  valid_from: '2026-10-01T00:00:00.000Z',
  valid_until: null,
  max_uses: 100,
  per_phone_limit: 2,
  used_count: 7,
  is_active: true,
  created_at: '2026-09-20T10:00:00.000Z',
  ...over,
});

/** One `myVenues` row the way the venue picker's query selects it. */
export const foodVenue = (over: Over = {}) => ({
  __typename: 'Venue',
  id: 'v1',
  venue_name: 'Blue Kettle',
  city: 'Pune',
  status: 'APPROVED',
  offers_food: true,
  ...over,
});

export const couponsPage = (rows: unknown[]) => ({
  venueFoodCouponsTable: { __typename: 'VenueFoodCouponTablePage', total: rows.length, rows },
});

/** Mounts the Food Coupons page on one food-serving venue holding `rows`. */
export function mountCoupons(rows: unknown[], answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) {
  return renderWithProviders(<VenueFoodCouponsPage />, {
    route: '/venues/food-coupons',
    link: scriptedLink(
      { VenueFoodOrderVenues: { myVenues: [foodVenue()] }, VenueFoodCouponsTable: couponsPage(rows), ...answers },
      sent,
    ),
  });
}

/** A form field's own input or textarea, by the test id on its wrapper. */
export const fieldOf = (testId: string) => {
  const input = screen.getByTestId(testId).querySelector('input, textarea:not([aria-hidden])');
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
    throw new TypeError(`No input under ${testId}`);
  }
  return input;
};

export const typeInto = (testId: string, value: string) => fireEvent.change(fieldOf(testId), { target: { value } });

export const sentNamed = (sent: readonly SentOperation[], name: string) => sent.filter((op) => op.name === name);

/** A switch's own checkbox, by the test id on its root. */
export const switchOf = (testId: string) => {
  const input = screen.getByTestId(testId).querySelector('input');
  if (!input) throw new TypeError(`No switch under ${testId}`);
  return input;
};
