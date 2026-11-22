/**
 * Gift card detail › Purchase payment: the Razorpay payment and order ids are
 * printed exactly as Razorpay's dashboard shows them, next to — never instead
 * of — Duncit's own reference.
 */
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import PaymentSection from '../../src/pages/gift-cards/virtual/detail/PaymentSection';
import type { GiftCardPaymentSummary } from '../../src/pages/gift-cards/virtual/detail/queries';
import { renderWithProviders } from '../testkit';

const payment = (over: Partial<GiftCardPaymentSummary> = {}): GiftCardPaymentSummary =>
  ({
    id: '6b02a7e5fe77cbb04987fe1b',
    payment_id: 'DPAY-MWRKSGXI1EE90B59',
    invoice_no: 'DUN/2627/000174',
    status: 'SUCCESS',
    gateway: 'RAZORPAY',
    gateway_ref: 'pay_U39hOwzQiUFqHT',
    razorpay_payment_id: 'pay_U39hOwzQiUFqHT',
    razorpay_order_id: 'order_U39IVJblWttbgN',
    subtotal: 423.73,
    platform_fee_amount: 21.19,
    gst_amount: 76.27,
    coupon_code: null,
    coupon_discount: 0,
    coins_redeemed: 0,
    total: 500,
    currency_symbol: '₹',
    paid_at: '2026-11-22T08:30:33.260Z',
    issue_step_status: 'DONE',
    email_step_status: 'DONE',
    email_step_detail: '',
    ...over,
  }) as GiftCardPaymentSummary;

describe('PaymentSection', () => {
  it('shows the Razorpay payment and order ids alongside the Duncit reference', () => {
    renderWithProviders(<PaymentSection payment={payment()} />);
    expect(screen.getByText('pay_U39hOwzQiUFqHT')).toBeInTheDocument();
    expect(screen.getByText('order_U39IVJblWttbgN')).toBeInTheDocument();
    expect(screen.getByText('DPAY-MWRKSGXI1EE90B59')).toBeInTheDocument();
  });

  it('shows dashes, not our reference, for a purchase that never went through Razorpay', () => {
    renderWithProviders(
      <PaymentSection payment={payment({ gateway: 'COINS', gateway_ref: null, razorpay_payment_id: null, razorpay_order_id: null })} />,
    );
    expect(screen.getByText('DPAY-MWRKSGXI1EE90B59')).toBeInTheDocument();
    expect(screen.queryByText(/^pay_/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^order_/)).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('says the record is missing when there is no payment', () => {
    renderWithProviders(<PaymentSection payment={null} />);
    expect(screen.queryByText('DPAY-MWRKSGXI1EE90B59')).not.toBeInTheDocument();
    expect(screen.getByTestId('section-card')).toBeInTheDocument();
  });
});
