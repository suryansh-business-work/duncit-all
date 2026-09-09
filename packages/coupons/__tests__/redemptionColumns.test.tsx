/**
 * The redemption table's columns, exercised as data rather than through the
 * grid: every value getter is called and every cell renderer mounted, against
 * a paid row that earned an invoice and a refunded one that never did.
 *
 * Money is asserted with the symbol the stats query reported rather than a
 * rupee, because that is the whole reason the symbol is a parameter.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createTranslator } from '@duncit/app-settings';
import { EM_DASH } from '@duncit/table';

import { COUPONS_FALLBACK_FLAT } from '../src/i18n';
import { getRedemptionColumns } from '../src/detail/redemptionColumns';
import type { CouponRedemptionRow } from '../src/queries';

const { t } = createTranslator({ locale: 'en-IN', fallback: COUPONS_FALLBACK_FLAT });

const redemption = (over: Partial<CouponRedemptionRow> = {}): CouponRedemptionRow => ({
  id: 'r-1',
  payment_id: 'pay_MkJ8102',
  invoice_no: 'DUN-INV-000241',
  user_id: 'u-1',
  user_name: 'Ananya Rao',
  user_email: 'ananya@example.com',
  user_phone: '+919812345678',
  pod_id: 'pod-1',
  description: 'Sunday Badminton',
  total: 1250,
  coupon_discount: 312,
  status: 'SUCCESS',
  paid_at: '2026-08-14T12:00:00.000Z',
  created_at: '2026-08-14T12:00:00.000Z',
  ...over,
});

const columns = getRedemptionColumns(t, '₹');

const column = (field: string) => {
  const found = columns.find((c) => c.field === field);
  if (!found) throw new Error(`no ${field} column`);
  return found;
};

const valueOf = (field: string, row: CouponRedemptionRow) => column(field).valueGetter?.(row);

const renderCell = (field: string, row: CouponRedemptionRow) =>
  render(<>{column(field).cellRenderer?.(row)}</>);

describe('getRedemptionColumns', () => {
  it('lists the columns the redemptions table is read left to right', () => {
    expect(columns.map((c) => c.field)).toEqual([
      'user_name',
      'description',
      'coupon_discount',
      'total',
      'status',
      'payment_id',
      'created_at',
    ]);
    expect(column('user_name').headerName).toBe('Member');
    expect(column('created_at').hide).toBe(false);
  });

  it('renders the member as a name over the email it was booked with', () => {
    renderCell('user_name', redemption());

    expect(screen.getByText('Ananya Rao')).toBeInTheDocument();
    expect(screen.getByText('ananya@example.com')).toBeInTheDocument();
    expect(valueOf('user_name', redemption())).toBe('Ananya Rao');
  });

  it('em-dashes a redemption whose payment carried no description', () => {
    expect(valueOf('description', redemption())).toBe('Sunday Badminton');
    expect(valueOf('description', redemption({ description: '' }))).toBe(EM_DASH);
  });

  it('formats both money columns with the symbol it was given', () => {
    expect(valueOf('coupon_discount', redemption())).toBe('₹312');
    expect(valueOf('total', redemption())).toBe('₹1,250');
    expect(getRedemptionColumns(t, '$')[3]?.valueGetter?.(redemption())).toBe('$1,250');
  });

  it('chips the payment state and offers both of them as a filter', () => {
    renderCell('status', redemption({ status: 'REFUNDED' }));

    expect(screen.getByText('REFUNDED')).toBeInTheDocument();
    expect(valueOf('status', redemption())).toBe('SUCCESS');
    expect(column('status').filter).toEqual({
      type: 'select',
      options: [
        { value: 'SUCCESS', label: 'Paid' },
        { value: 'REFUNDED', label: 'Refunded' },
      ],
    });
  });

  it('shows the invoice number, falling back to the gateway id before one is raised', () => {
    expect(valueOf('payment_id', redemption())).toBe('DUN-INV-000241');
    expect(valueOf('payment_id', redemption({ invoice_no: null }))).toBe('pay_MkJ8102');
  });

  it('reads the redemption date in the admin-configured pattern', () => {
    expect(valueOf('created_at', redemption())).toBe('14 Aug 2026');
  });
});
