import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import type { DateInput } from '@duncit/app-settings';
import AmountBreakupCard from '../../src/pages/finance/payment-detail-page/AmountBreakupCard';
import CouponCard from '../../src/pages/finance/payment-detail-page/CouponCard';
import CustomerCard from '../../src/pages/finance/payment-detail-page/CustomerCard';
import GiftCardBlock from '../../src/pages/finance/payment-detail-page/GiftCardBlock';
import PodBookingCard from '../../src/pages/finance/payment-detail-page/PodBookingCard';
import { renderWithProviders } from '../testkit';
import {
  makeBilling,
  makeCoupon,
  makeDetailPayment,
  makeGiftCard,
  makePaymentDetail,
  makePodBooking,
} from '../mocks/payment-detail.mock';

/** A predictable stand-in for the admin-configured formatter the page passes down. */
const formatDateTime = (value: DateInput) => (typeof value === 'string' ? `on ${value}` : '');

/** The InfoRow stub renders label then value; this reads the value beside a label. */
const valueOf = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

describe('AmountBreakupCard', () => {
  it('lists only the lines that reconcile when nothing was discounted', () => {
    const detail = makePaymentDetail({
      payment: makeDetailPayment({ coupon_code: null, coupon_discount: 0, ticket_discount_amount: 0, ticket_discount_pct: 0 }),
      coins_redeemed: 0,
      original_total: 1000,
    });
    renderWithProviders(<AmountBreakupCard detail={detail} />);

    expect(valueOf('Original total')).toBe('₹1000.00');
    expect(valueOf('Subtotal (net of GST)')).toBe('₹847.46');
    expect(valueOf('Total charged')).toBe('₹1000.00');
    expect(screen.queryByText(/Multi-ticket discount/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Coupon discount/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Coins redeemed/)).not.toBeInTheDocument();
    // The fee is a memo inside the subtotal, shown even though it never adds on top.
    expect(valueOf('Platform fee (10.00% of subtotal)')).toBe('₹84.75');
  });

  it('names a coupon discount without a code when the code did not survive on the payment', () => {
    const detail = makePaymentDetail({
      payment: makeDetailPayment({ coupon_code: null, coupon_discount: 100 }),
    });
    renderWithProviders(<AmountBreakupCard detail={detail} />);
    expect(valueOf('Coupon discount')).toBe('− ₹100.00');
  });
});

describe('CouponCard', () => {
  it('warns when the coupon rule has since been deleted', () => {
    renderWithProviders(<CouponCard coupon={makeCoupon({ still_exists: false })} currencySymbol="₹" />);
    expect(valueOf('Code')).toBe('YOGA10');
    expect(valueOf('Discount charged')).toBe('₹100.00');
    expect(valueOf('Discount value')).toBe('10');
    expect(screen.getByText('This coupon has since been deleted.')).toBeInTheDocument();
  });
});

describe('CustomerCard', () => {
  it('prints the frozen bill-to block', () => {
    renderWithProviders(<CustomerCard payment={makeDetailPayment()} />);
    expect(valueOf('Phone')).toBe('+91 98765 43210');
    expect(valueOf('Bill to')).toBe('Riya Sharma');
    expect(valueOf('GSTIN')).toBe('29ABCDE1234F1Z5');
    expect(valueOf('Gateway reference')).toBe('pay_Nx12Razor');
  });

  it('shows a dash for every blank billing field instead of a dangling comma', () => {
    const blank = makeBilling({
      name: '',
      email: '',
      phone: '',
      gstin: '',
      line1: '',
      line2: '   ',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      country: '',
    });
    renderWithProviders(
      <CustomerCard payment={makeDetailPayment({ user_phone: null, gateway_ref: null, billing: blank })} />,
    );
    for (const label of ['Phone', 'Bill to', 'Billing email', 'Billing phone', 'GSTIN', 'Address', 'Gateway reference']) {
      expect(valueOf(label)).toBe('—');
    }
    expect(valueOf('Email')).toBe('riya@duncit.com');
  });
});

describe('PodBookingCard', () => {
  it('shows the pod date and the multi-ticket tier frozen at checkout', () => {
    renderWithProviders(
      <PodBookingCard booking={makePodBooking()} payment={makeDetailPayment()} formatDateTime={formatDateTime} />,
    );
    expect(screen.getByRole('heading', { name: 'Pod booking' })).toBeInTheDocument();
    expect(valueOf('Date')).toBe('on 2026-09-20T06:30:00.000Z');
    expect(valueOf('Seats')).toBe('2');
    expect(valueOf('Multi-ticket tier')).toBe('5% · −₹50.00');
    expect(valueOf('Ticket code')).toBe('TKT-7788');
  });

  it('marks an undated pod, no tier and a booking that was never written', () => {
    const booking = makePodBooking({
      pod_date_time: null,
      membership_id: null,
      membership_status: null,
      ticket_code: null,
      ticket_status: null,
    });
    const payment = makeDetailPayment({ ticket_discount_amount: 0, ticket_discount_pct: 0 });
    renderWithProviders(<PodBookingCard booking={booking} payment={payment} formatDateTime={formatDateTime} />);
    expect(valueOf('Date')).toBe('—');
    expect(valueOf('Multi-ticket tier')).toBe('None');
    for (const label of ['Membership', 'Membership status', 'Ticket code', 'Ticket status']) {
      expect(valueOf(label)).toBe('—');
    }
  });
});

describe('GiftCardBlock', () => {
  it('shows who the card was for, what is left on it and when it was used', () => {
    renderWithProviders(<GiftCardBlock card={makeGiftCard()} currencySymbol="₹" formatDateTime={formatDateTime} />);
    expect(screen.getByRole('heading', { name: 'Gift card' })).toBeInTheDocument();
    expect(valueOf('Sent to')).toBe('aman@duncit.com');
    expect(valueOf('Recipient name')).toBe('Aman Verma');
    expect(valueOf('Redeemable on')).toBe('All pods');
    expect(valueOf('Face value')).toBe('₹1000.00');
    expect(valueOf('Balance')).toBe('₹400.00');
    expect(valueOf('Expires')).toBe('on 2027-09-01T00:00:00.000Z');
    expect(valueOf('Redeemed')).toBe('on 2026-09-05T12:00:00.000Z');
  });

  it('spells out a self-purchase that is not yet redeemed and never expires', () => {
    const card = makeGiftCard({
      recipient_email: '',
      recipient_name: '',
      scope_name: '',
      expires_at: null,
      redeemed_at: null,
    });
    renderWithProviders(<GiftCardBlock card={card} currencySymbol="₹" formatDateTime={formatDateTime} />);
    expect(valueOf('Sent to')).toBe('Bought for themselves');
    for (const label of ['Recipient name', 'Redeemable on', 'Expires', 'Redeemed']) {
      expect(valueOf(label)).toBe('—');
    }
  });
});
