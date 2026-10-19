import { screen, within } from '@testing-library/react-native';

import { RentalSuccessCard } from '@/components/checkout/RentalSuccessCard';
import { renderWithProviders } from '@/utils/test-utils';

const LINES = [
  { item_id: 'uno', name: 'UNO Cards', quantity: 1, rent: 50, deposit: 30 },
  { item_id: 'chess', name: 'Chess Set', quantity: 2, rent: 120, deposit: 0 },
];

describe('RentalSuccessCard', () => {
  it('lists the paid booking’s rented items and that they are collected at the venue', () => {
    renderWithProviders(
      <RentalSuccessCard
        payment={{ currency_symbol: '₹', rental_lines: LINES }}
        depositRefundable
      />,
    );
    const card = screen.getByTestId('checkout-success-rentals');
    expect(within(card).getByText('Rented items on this booking')).toBeOnTheScreen();
    expect(within(card).getByTestId('checkout-success-rental-uno')).toHaveTextContent(
      /UNO Cards × 1.*₹\s?50/,
    );
    expect(within(card).getByTestId('checkout-success-rental-chess')).toHaveTextContent(
      /Chess Set × 2.*₹\s?120/,
    );
    // Only the item that took a deposit says where it comes back.
    expect(within(card).getAllByText(/refundable at the venue/)).toHaveLength(1);
    expect(within(card).getByTestId('rental-collect-notice')).toHaveTextContent(
      /Duncit does not refund deposits online/,
    );
  });

  it('says the deposit is kept when Finance made deposits non-refundable', () => {
    renderWithProviders(
      <RentalSuccessCard
        payment={{ currency_symbol: '₹', rental_lines: LINES }}
        depositRefundable={false}
      />,
    );
    expect(screen.getByTestId('rental-collect-notice')).toHaveTextContent(/not refundable/);
  });

  it('renders nothing for a free join, which has no payment', () => {
    renderWithProviders(<RentalSuccessCard payment={null} depositRefundable />);
    expect(screen.queryByTestId('checkout-success-rentals')).toBeNull();
  });

  it('renders nothing for a booking without rented items', () => {
    renderWithProviders(
      <RentalSuccessCard payment={{ currency_symbol: '₹', rental_lines: [] }} depositRefundable />,
    );
    expect(screen.queryByTestId('checkout-success-rentals')).toBeNull();
  });
});
