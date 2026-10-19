import { screen, within } from '@testing-library/react-native';

import { RentalCheckoutCard } from '@/components/checkout/RentalCheckoutCard';
import type { CheckoutRentals } from '@/hooks/useCheckoutRentals';
import { renderWithProviders } from '@/utils/test-utils';

const SETTINGS = {
  enabled: true,
  terms_html: '<p>Return items clean.</p>',
  rent_refundable_on_backout: true,
  deposit_refundable: true,
  booking_cutoff_hours: 2,
};

const rentals = (over: Partial<CheckoutRentals> = {}): CheckoutRentals => ({
  selections: [{ item_id: 'racket', quantity: 2 }],
  totals: { rent: 300, deposit: 400, total: 700, count: 2 },
  lines: [{ id: 'racket', name: 'Racket', quantity: 2, rent: 300, deposit: 400 }],
  currency: '₹',
  venueTerms: '<p>No <b>wet</b> shoes on court.</p>',
  settings: SETTINGS,
  agreed: false,
  setAgreed: jest.fn(),
  blocked: true,
  ...over,
});

describe('RentalCheckoutCard', () => {
  it('renders nothing when no item is picked', () => {
    renderWithProviders(
      <RentalCheckoutCard
        rentals={rentals({ totals: { rent: 0, deposit: 0, total: 0, count: 0 }, lines: [] })}
      />,
    );
    expect(screen.queryByTestId('checkout-rentals')).toBeNull();
  });

  it('lists each rented item with its rent, and its deposit as refundable at the venue', () => {
    renderWithProviders(<RentalCheckoutCard rentals={rentals()} />);
    const line = screen.getByTestId('checkout-rental-line');
    expect(within(line).getByTestId('checkout-rental-line-racket')).toHaveTextContent(
      /Racket × 2.*₹\s?300/,
    );
    expect(within(line).getByText(/Deposit ₹\s?400, refundable at the venue/)).toBeOnTheScreen();
  });

  it('adds the rent and the refundable deposit, and says coupons and coins are for the ticket only', () => {
    renderWithProviders(<RentalCheckoutCard rentals={rentals()} />);
    expect(screen.getByTestId('checkout-rental-rent')).toHaveTextContent(
      /Rent subtotal.*\+ ₹\s?300/,
    );
    expect(screen.getByTestId('checkout-rental-deposit')).toHaveTextContent(
      /Refundable deposit.*\+ ₹\s?400/,
    );
    expect(screen.getByText('Coupons and coins apply to the ticket only.')).toBeOnTheScreen();
  });

  it('says the items are collected at the venue and the deposit is returned there, not online', () => {
    renderWithProviders(<RentalCheckoutCard rentals={rentals()} />);
    const notice = screen.getByTestId('rental-collect-notice');
    expect(within(notice).getByText('Collected at the venue')).toBeOnTheScreen();
    expect(notice).toHaveTextContent(/returned by the venue when you bring the item back/);
    expect(notice).toHaveTextContent(/Duncit does not refund deposits online/);
  });

  it('names the deposit as kept by the venue when Finance made deposits non-refundable', () => {
    renderWithProviders(
      <RentalCheckoutCard
        rentals={rentals({ settings: { ...SETTINGS, deposit_refundable: false } })}
      />,
    );
    expect(screen.getByTestId('checkout-rental-deposit')).toHaveTextContent(
      /Deposit \(kept by the venue\)/,
    );
    expect(screen.getByText(/Deposit \(kept by the venue\) ₹\s?400/)).toBeOnTheScreen();
    expect(screen.getByTestId('rental-collect-notice')).toHaveTextContent(
      /kept by the venue and is not refundable/,
    );
  });

  it('shows no deposit line for items without one', () => {
    renderWithProviders(
      <RentalCheckoutCard
        rentals={rentals({
          totals: { rent: 300, deposit: 0, total: 300, count: 1 },
          lines: [{ id: 'racket', name: 'Racket', quantity: 1, rent: 300, deposit: 0 }],
        })}
      />,
    );
    expect(screen.queryByTestId('checkout-rental-deposit')).toBeNull();
    expect(screen.queryByText(/refundable at the venue/)).toBeNull();
  });

  it('reads the deposit as refundable before Finance’s rules have loaded', () => {
    renderWithProviders(<RentalCheckoutCard rentals={rentals({ settings: null })} />);
    expect(screen.getByTestId('checkout-rental-deposit')).toHaveTextContent(/Refundable deposit/);
  });
});
