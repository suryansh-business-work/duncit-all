import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { rentalMoney, type RentalBookingRow } from '@duncit/utils';

import RentalBookingCard from '../RentalBookingCard';
import { fallbackT } from '../../../i18n/fallback';

const m = (amount: number) => rentalMoney('₹', amount);

const row = (over: Partial<RentalBookingRow> = {}): RentalBookingRow => ({
  id: 'r1',
  currency_symbol: '₹',
  payment_ref: 'DPAY-1',
  pod_id: 'p1',
  pod_title: 'Sunday Smash',
  guest_name: 'Asha',
  venue_id: 'v1',
  item_id: 'i1',
  name: 'Racket',
  image_url: '',
  unit: 'SLOT',
  rate: 300,
  units: 1,
  quantity: 1,
  rent_amount: 300,
  deposit_amount: 500,
  status: 'RETURNED',
  damage_claim: 0,
  damage_note: '',
  refund_due: 500,
  refund_status: 'DUE',
  refund_ref: '',
  refunded_at: null,
  deposit_at_venue: 0,
  commission_pct: 10,
  commission_amount: 30,
  venue_amount: 270,
  release_id: null,
  marked_at: '2026-11-20T10:00:00.000Z',
  auto_released: false,
  created_at: '2026-11-19T10:00:00.000Z',
  ...over,
});

const outcome = () => screen.queryByTestId('rented-item-r1-outcome');

describe('RentalBookingCard', () => {
  it('lists the item, its pod, units, rent and deposit', () => {
    render(<RentalBookingCard row={row({ status: 'BOOKED', refund_due: 0, refund_status: 'NONE' })} />);
    expect(screen.getByText('Racket')).toBeInTheDocument();
    expect(screen.getByText(/For Sunday Smash/)).toBeInTheDocument();
    expect(screen.getByTestId('rented-item-r1')).toHaveTextContent(fallbackT('venueRentals.guest.deposit', { vars: { amount: m(500) } }));
  });

  it('says the deposit comes back after return while the item is out', () => {
    render(<RentalBookingCard row={row({ status: 'BOOKED', refund_due: 0, refund_status: 'NONE', refund_state: 'AWAITING_RETURN' })} />);
    expect(outcome()).toHaveTextContent(fallbackT('venueRentals.guest.depositBack', { vars: { amount: m(500) } }));
  });

  it('says refunded with Razorpay’s amount only once Razorpay confirmed it', () => {
    render(<RentalBookingCard row={row({ refund_status: 'PAID', refund_state: 'REFUNDED', refunded_amount: 500 })} />);
    expect(outcome()).toHaveTextContent(fallbackT('venueRentals.guest.refunded', { vars: { amount: m(500) } }));
  });

  it('says processing — not refunded — while Razorpay has not confirmed', () => {
    render(<RentalBookingCard row={row({ refund_state: 'PROCESSING', refund_outstanding: 500 })} />);
    expect(outcome()).toHaveTextContent(fallbackT('venueRentals.guest.refundProcessing', { vars: { amount: m(500) } }));
    expect(outcome()).not.toHaveTextContent(fallbackT('venueRentals.guest.refunded', { vars: { amount: m(500) } }));
  });

  it('reads an older hand-marked refund as under review', () => {
    render(<RentalBookingCard row={row({ refund_status: 'PAID' })} />);
    expect(outcome()).toHaveTextContent(fallbackT('venueRentals.guest.refundReview', { vars: { amount: m(500) } }));
  });

  it('says what was kept for damage when nothing comes back, and nothing at all with no refund owed', () => {
    const { unmount } = render(
      <RentalBookingCard row={row({ status: 'DAMAGED', refund_due: 0, refund_status: 'NONE', refund_state: 'NOT_ELIGIBLE', damage_claim: 500 })} />
    );
    expect(outcome()).toHaveTextContent(fallbackT('venueRentals.guest.damageKept', { vars: { amount: m(500) } }));
    unmount();
    render(<RentalBookingCard row={row({ deposit_amount: 0, refund_due: 0, refund_status: 'NONE', refund_state: 'NOT_ELIGIBLE' })} />);
    expect(outcome()).toBeNull();
  });
});
