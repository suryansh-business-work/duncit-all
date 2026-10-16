import { fireEvent, screen } from '@testing-library/react-native';

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
        rentals={rentals({ totals: { rent: 0, deposit: 0, total: 0, count: 0 } })}
      />,
    );
    expect(screen.queryByTestId('checkout-rentals')).toBeNull();
  });

  it('adds the rent and the refundable deposit, and says coupons and coins are for the ticket only', () => {
    renderWithProviders(<RentalCheckoutCard rentals={rentals()} />);
    expect(screen.getByTestId('checkout-rental-rent')).toHaveTextContent(/\+ ₹\s?300/);
    expect(screen.getByTestId('checkout-rental-deposit')).toHaveTextContent(
      /Refundable deposit.*\+ ₹\s?400/,
    );
    expect(screen.getByText('Coupons and coins apply to the ticket only.')).toBeOnTheScreen();
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
  });

  it('shows no deposit line for items without one', () => {
    renderWithProviders(
      <RentalCheckoutCard
        rentals={rentals({ totals: { rent: 300, deposit: 0, total: 300, count: 1 } })}
      />,
    );
    expect(screen.queryByTestId('checkout-rental-deposit')).toBeNull();
  });

  it('records the agreement to the rental terms', () => {
    const value = rentals();
    renderWithProviders(<RentalCheckoutCard rentals={value} />);
    fireEvent(screen.getByTestId('checkout-rental-agree-switch'), 'valueChange', true);
    expect(value.setAgreed).toHaveBeenCalledWith(true);
  });

  it('opens Duncit’s terms and then the venue’s own, as plain text', () => {
    renderWithProviders(<RentalCheckoutCard rentals={rentals()} />);
    expect(screen.queryByText('Duncit’s rental terms')).toBeNull();

    fireEvent.press(screen.getByTestId('checkout-rental-terms'));

    expect(screen.getByText('Duncit’s rental terms')).toBeOnTheScreen();
    expect(screen.getByText('Return items clean.')).toBeOnTheScreen();
    expect(screen.getByText('The venue’s rental terms')).toBeOnTheScreen();
    // The venue's markup never renders: the tags are gone, the words stay.
    expect(screen.getByText('No wet shoes on court.')).toBeOnTheScreen();
  });

  it('shows only the venue’s section when Duncit has no terms, and only Duncit’s when the venue has none', () => {
    const { rerender } = renderWithProviders(
      <RentalCheckoutCard rentals={rentals({ settings: { ...SETTINGS, terms_html: '' } })} />,
    );
    fireEvent.press(screen.getByTestId('checkout-rental-terms'));
    expect(screen.queryByText('Duncit’s rental terms')).toBeNull();
    expect(screen.getByText('The venue’s rental terms')).toBeOnTheScreen();

    rerender(<RentalCheckoutCard rentals={rentals({ venueTerms: '' })} />);
    expect(screen.getByText('Duncit’s rental terms')).toBeOnTheScreen();
    expect(screen.queryByText('The venue’s rental terms')).toBeNull();
  });

  it('offers no terms link when neither side wrote any', () => {
    renderWithProviders(
      <RentalCheckoutCard rentals={rentals({ settings: null, venueTerms: '' })} />,
    );
    expect(screen.queryByTestId('checkout-rental-terms')).toBeNull();
    // Without Finance's rules loaded the deposit reads as refundable.
    expect(screen.getByTestId('checkout-rental-deposit')).toHaveTextContent(/Refundable deposit/);
  });
});
