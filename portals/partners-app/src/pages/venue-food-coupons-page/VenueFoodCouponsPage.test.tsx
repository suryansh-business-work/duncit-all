import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { couponRow, fieldOf, foodVenue, mountCoupons, sentNamed, switchOf } from './__tests__/harness';
import { recordNotices } from '../../__tests__/groupC-notices';
import type { SentOperation } from '../../__tests__/groupC-link';

let notices: ReturnType<typeof recordNotices>;
beforeEach(() => {
  globalThis.localStorage.clear();
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  cleanup();
});
const messages = () => notices.notices.map((n) => n.message);

const rowOf = async (text: string) => {
  const row = (await screen.findByText(text)).closest('[role="row"]');
  if (!(row instanceof HTMLElement)) throw new TypeError(`No row for ${text}`);
  return row;
};

describe('VenueFoodCouponsPage list', () => {
  it('lists each coupon with its discount, minimum, window, uses and limits', async () => {
    const sent: SentOperation[] = [];
    mountCoupons(
      [couponRow(), couponRow({ id: 'c2', code: 'OPEN5', discount_pct: 5, min_order_amount: 0, valid_from: null, max_uses: null, per_phone_limit: null, used_count: 0 })],
      {},
      sent,
    );
    const capped = within(await rowOf('WELCOME10'));
    expect(capped.getByText('First visit')).toBeTruthy();
    expect(capped.getByText('10%')).toBeTruthy();
    expect(capped.getByText('₹200.00')).toBeTruthy();
    expect(capped.getByText('7 of 100')).toBeTruthy();
    expect(capped.getByText('2')).toBeTruthy();
    expect(capped.getByText('No end date')).toBeTruthy();
    // The start is a real date, drawn by the configured formatter rather than left as the fallback.
    expect(capped.queryByText('Right away')).toBeNull();
    expect(capped.getByText(/2026/)).toBeTruthy();

    const open = within(await rowOf('OPEN5'));
    expect(open.getByText('No minimum')).toBeTruthy();
    expect(open.getByText('Right away')).toBeTruthy();
    expect(open.getByText('0 · no limit')).toBeTruthy();
    expect(open.getByText('No limit')).toBeTruthy();

    expect(sentNamed(sent, 'VenueFoodCouponsTable')[0].variables.venue_id).toBe('v1');
  });

  it('says so when the venue has no coupons yet', async () => {
    mountCoupons([]);
    expect(await screen.findByText(/No food coupons yet/)).toBeTruthy();
  });

  it('shows the server message when the coupons cannot be read', async () => {
    mountCoupons([], { VenueFoodCouponsTable: new Error('Coupons unavailable') });
    expect(await screen.findByText('Coupons unavailable')).toBeTruthy();
  });

  it('shows the server message when the venues cannot be read', async () => {
    mountCoupons([], { VenueFoodOrderVenues: new Error('Venues unavailable') });
    expect((await screen.findByTestId('venue-food-coupons-error')).textContent).toBe('Venues unavailable');
  });

  it('points a venue without food at its Food Menu section instead of a table', async () => {
    const sent: SentOperation[] = [];
    mountCoupons([couponRow()], { VenueFoodOrderVenues: { myVenues: [foodVenue({ offers_food: false })] } }, sent);
    const hint = await screen.findByTestId('venue-food-coupons-no-food');
    expect(within(hint).getByRole('link', { name: 'Edit venue' }).getAttribute('href')).toBe('/venues/food-settings');
    expect(sentNamed(sent, 'VenueFoodCouponsTable')).toHaveLength(0);
  });
});

describe('VenueFoodCouponsPage active switch', () => {
  const activeSwitch = () => switchOf('food-coupon-active-c1');

  it('switches a coupon off and keeps the server’s answer', async () => {
    const sent: SentOperation[] = [];
    mountCoupons([couponRow()], { SetVenueFoodCouponActive: { setVenueFoodCouponActive: couponRow({ is_active: false }) } }, sent);
    await rowOf('WELCOME10');
    expect(activeSwitch().checked).toBe(true);
    expect(activeSwitch().getAttribute('aria-label')).toBe('Active: WELCOME10');

    fireEvent.click(activeSwitch());
    await waitFor(() => expect(messages()).toContain('Coupon WELCOME10 is off. Guests can no longer use it.'));
    expect(sentNamed(sent, 'SetVenueFoodCouponActive').map((op) => op.variables)).toEqual([{ coupon_id: 'c1', is_active: false }]);
    await waitFor(() => expect(activeSwitch().checked).toBe(false));
  });

  it('puts the switch back and says why when the server refuses', async () => {
    mountCoupons([couponRow()], { SetVenueFoodCouponActive: new Error('Coupon not found') });
    await rowOf('WELCOME10');
    fireEvent.click(activeSwitch());
    await waitFor(() => expect(messages()).toContain('Coupon not found'));
    await waitFor(() => expect(activeSwitch().checked).toBe(true));
  });
});

describe('VenueFoodCouponsPage delete', () => {
  it('deletes only after the confirm dialog is accepted, then reloads the list', async () => {
    const sent: SentOperation[] = [];
    mountCoupons([couponRow()], { DeleteVenueFoodCoupon: { deleteVenueFoodCoupon: true } }, sent);
    await rowOf('WELCOME10');
    const loads = sentNamed(sent, 'VenueFoodCouponsTable').length;

    fireEvent.click(screen.getByTestId('food-coupon-delete-c1'));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Delete coupon WELCOME10?')).toBeTruthy();
    expect(sentNamed(sent, 'DeleteVenueFoodCoupon')).toHaveLength(0);

    fireEvent.click(dialog.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(messages()).toContain('Coupon WELCOME10 deleted'));
    expect(sentNamed(sent, 'DeleteVenueFoodCoupon').map((op) => op.variables)).toEqual([{ coupon_id: 'c1' }]);
    await waitFor(() => expect(sentNamed(sent, 'VenueFoodCouponsTable').length).toBeGreaterThan(loads));
  });

  it('deletes nothing when the confirm dialog is cancelled', async () => {
    const sent: SentOperation[] = [];
    mountCoupons([couponRow()], {}, sent);
    await rowOf('WELCOME10');
    fireEvent.click(screen.getByTestId('food-coupon-delete-c1'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sentNamed(sent, 'DeleteVenueFoodCoupon')).toHaveLength(0);
    expect(messages()).toEqual([]);
  });

  it('shows the server message when the delete is refused', async () => {
    mountCoupons([couponRow()], { DeleteVenueFoodCoupon: new Error('Coupon not found') });
    await rowOf('WELCOME10');
    fireEvent.click(screen.getByTestId('food-coupon-delete-c1'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(messages()).toContain('Coupon not found'));
  });
});

describe('VenueFoodCouponsPage edit entry', () => {
  it('opens the edit dialog on the coupon’s own terms', async () => {
    mountCoupons([couponRow()]);
    await rowOf('WELCOME10');
    fireEvent.click(screen.getByTestId('food-coupon-edit-c1'));
    expect(await screen.findByText('Edit coupon WELCOME10')).toBeTruthy();
    expect(fieldOf('food-coupon-code').value).toBe('WELCOME10');
  });
});
