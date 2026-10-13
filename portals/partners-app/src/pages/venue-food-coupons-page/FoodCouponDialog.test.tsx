import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { couponRow, fieldOf, mountCoupons, sentNamed, switchOf, typeInto } from './__tests__/harness';
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

const openNew = async () => {
  fireEvent.click(await screen.findByTestId('food-coupon-new'));
  await screen.findByText('New food coupon');
};

const save = () => fireEvent.click(screen.getByTestId('food-coupon-save'));

describe('creating a food coupon', () => {
  it('upper-cases the code as it is typed and creates the coupon for the selected venue', async () => {
    const sent: SentOperation[] = [];
    mountCoupons([], { CreateVenueFoodCoupon: { createVenueFoodCoupon: couponRow({ id: 'c9', code: 'DIWALI_15' }) } }, sent);
    await openNew();
    const loads = sentNamed(sent, 'VenueFoodCouponsTable').length;

    typeInto('food-coupon-code', 'diwali_15');
    expect(fieldOf('food-coupon-code').value).toBe('DIWALI_15');
    typeInto('food-coupon-description', '  Festive week ');
    typeInto('food-coupon-discount', '15');
    typeInto('food-coupon-min-order', '249.50');
    typeInto('food-coupon-max-uses', '50');
    save();

    await waitFor(() => expect(messages()).toContain('Coupon DIWALI_15 created'));
    expect(sentNamed(sent, 'CreateVenueFoodCoupon').map((op) => op.variables)).toEqual([
      {
        input: {
          venue_id: 'v1',
          code: 'DIWALI_15',
          description: 'Festive week',
          discount_pct: 15,
          min_order_amount: 249.5,
          valid_from: null,
          valid_until: null,
          max_uses: 50,
          per_phone_limit: null,
          is_active: true,
        },
      },
    ]);
    await waitFor(() => expect(screen.queryByTestId('food-coupon-form')).toBeNull());
    // A new coupon is a new row, so the list is asked again.
    await waitFor(() => expect(sentNamed(sent, 'VenueFoodCouponsTable').length).toBeGreaterThan(loads));
  });

  it('keeps the dialog and what was typed when the venue already uses the code', async () => {
    const sent: SentOperation[] = [];
    mountCoupons([], { CreateVenueFoodCoupon: new Error('This venue already has a coupon with this code') }, sent);
    await openNew();
    typeInto('food-coupon-code', 'WELCOME10');
    typeInto('food-coupon-discount', '10');
    save();

    expect((await screen.findByTestId('food-coupon-error')).textContent).toBe('This venue already has a coupon with this code');
    expect(fieldOf('food-coupon-code').value).toBe('WELCOME10');
    expect(fieldOf('food-coupon-discount').value).toBe('10');
    expect(messages()).toEqual([]);
  });

  it('sends nothing until the code and the discount pass the rules', async () => {
    const sent: SentOperation[] = [];
    mountCoupons([], {}, sent);
    await openNew();
    typeInto('food-coupon-code', 'AB');
    typeInto('food-coupon-discount', '95');
    typeInto('food-coupon-per-person', '0');
    save();

    expect(await screen.findByText('Use 3 to 30 characters')).toBeTruthy();
    expect(screen.getByText('Enter a whole number from 1 to 90')).toBeTruthy();
    expect(screen.getByText('Enter a whole number of 1 or more, or leave it empty')).toBeTruthy();
    expect(sentNamed(sent, 'CreateVenueFoodCoupon')).toHaveLength(0);
  });

  it('closes without saving on Cancel', async () => {
    const sent: SentOperation[] = [];
    mountCoupons([], {}, sent);
    await openNew();
    typeInto('food-coupon-code', 'WELCOME10');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByTestId('food-coupon-form')).toBeNull());
    expect(sentNamed(sent, 'CreateVenueFoodCoupon')).toHaveLength(0);
  });
});

describe('editing a food coupon', () => {
  const openEdit = async () => {
    fireEvent.click(await screen.findByTestId('food-coupon-edit-c1'));
    await screen.findByText('Edit coupon WELCOME10');
  };

  it('opens on the saved terms and sends null for a limit that was emptied', async () => {
    const sent: SentOperation[] = [];
    const saved = couponRow({ discount_pct: 20, max_uses: null });
    mountCoupons([couponRow()], { UpdateVenueFoodCoupon: { updateVenueFoodCoupon: saved } }, sent);
    await openEdit();
    const loads = sentNamed(sent, 'VenueFoodCouponsTable').length;

    expect(fieldOf('food-coupon-description').value).toBe('First visit');
    expect(fieldOf('food-coupon-discount').value).toBe('10');
    expect(fieldOf('food-coupon-min-order').value).toBe('200');
    expect(fieldOf('food-coupon-max-uses').value).toBe('100');
    expect(fieldOf('food-coupon-per-person').value).toBe('2');
    expect(switchOf('food-coupon-active').checked).toBe(true);

    typeInto('food-coupon-discount', '20');
    typeInto('food-coupon-max-uses', '');
    save();

    await waitFor(() => expect(messages()).toContain('Coupon WELCOME10 updated'));
    expect(sentNamed(sent, 'UpdateVenueFoodCoupon').map((op) => op.variables)).toEqual([
      {
        coupon_id: 'c1',
        input: {
          code: 'WELCOME10',
          description: 'First visit',
          discount_pct: 20,
          min_order_amount: 200,
          valid_from: '2026-10-01T00:00:00.000Z',
          valid_until: null,
          max_uses: null,
          per_phone_limit: 2,
          is_active: true,
        },
      },
    ]);
    // The edited row is repainted from the answer — no second read of the list.
    expect(await screen.findByText('7 · no limit')).toBeTruthy();
    expect(screen.getByText('20%')).toBeTruthy();
    expect(sentNamed(sent, 'VenueFoodCouponsTable')).toHaveLength(loads);
  });

  it('switches the coupon off from the form', async () => {
    const sent: SentOperation[] = [];
    mountCoupons([couponRow()], { UpdateVenueFoodCoupon: { updateVenueFoodCoupon: couponRow({ is_active: false }) } }, sent);
    await openEdit();
    fireEvent.click(switchOf('food-coupon-active'));
    save();
    await waitFor(() => expect(sentNamed(sent, 'UpdateVenueFoodCoupon')).toHaveLength(1));
    expect(sentNamed(sent, 'UpdateVenueFoodCoupon')[0].variables.input).toMatchObject({ is_active: false });
  });

  it('refuses a window that ends before it starts', async () => {
    const sent: SentOperation[] = [];
    mountCoupons([couponRow({ valid_until: '2026-09-01T00:00:00.000Z' })], {}, sent);
    await openEdit();
    save();
    expect(await screen.findByText('The end must be after the start')).toBeTruthy();
    expect(sentNamed(sent, 'UpdateVenueFoodCoupon')).toHaveLength(0);
  });
});
