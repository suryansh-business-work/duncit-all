import { fireEvent, screen } from '@testing-library/react-native';

import { RentalTermsConsent } from '@/components/checkout/RentalTermsConsent';
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
  selections: [{ item_id: 'racket', quantity: 1 }],
  totals: { rent: 150, deposit: 200, total: 350, count: 1 },
  lines: [{ id: 'racket', name: 'Racket', quantity: 1, rent: 150, deposit: 200 }],
  currency: '₹',
  venueTerms: '<p>No <b>wet</b> shoes on court.</p>',
  settings: SETTINGS,
  agreed: false,
  setAgreed: jest.fn(),
  blocked: true,
  ...over,
});

describe('RentalTermsConsent', () => {
  it('asks for nothing when no item is rented', () => {
    renderWithProviders(
      <RentalTermsConsent
        rentals={rentals({ totals: { rent: 0, deposit: 0, total: 0, count: 0 } })}
      />,
    );
    expect(screen.queryByTestId('checkout-rental-consent')).toBeNull();
  });

  it('ticks and unticks the agreement, which reads with the terms link as one sentence', () => {
    const value = rentals();
    const { rerender } = renderWithProviders(<RentalTermsConsent rentals={value} />);
    const box = screen.getByTestId('checkout-rental-agree');
    expect(box).toHaveProp('aria-checked', false);
    expect(box).toHaveProp('aria-label', 'I agree to the rental terms');
    fireEvent.press(box);
    expect(value.setAgreed).toHaveBeenCalledWith(true);

    const agreed = rentals({ agreed: true, blocked: false });
    rerender(<RentalTermsConsent rentals={agreed} />);
    expect(screen.getByTestId('checkout-rental-agree')).toHaveProp('aria-checked', true);
    fireEvent.press(screen.getByTestId('checkout-rental-agree'));
    expect(agreed.setAgreed).toHaveBeenCalledWith(false);
  });

  it('opens Duncit’s terms and then the venue’s own from the link, as plain text', () => {
    renderWithProviders(<RentalTermsConsent rentals={rentals()} />);
    expect(screen.queryByText('Duncit’s rental terms')).toBeNull();

    fireEvent.press(screen.getByTestId('checkout-rental-terms'));

    expect(screen.getByText('Duncit’s rental terms')).toBeOnTheScreen();
    expect(screen.getByText('Return items clean.')).toBeOnTheScreen();
    expect(screen.getByText('The venue’s rental terms')).toBeOnTheScreen();
    // The venue's markup never renders: the tags are gone, the words stay.
    expect(screen.getByText('No wet shoes on court.')).toBeOnTheScreen();
  });

  it('shows only the side that wrote terms', () => {
    const { rerender } = renderWithProviders(
      <RentalTermsConsent rentals={rentals({ settings: { ...SETTINGS, terms_html: '' } })} />,
    );
    fireEvent.press(screen.getByTestId('checkout-rental-terms'));
    expect(screen.queryByText('Duncit’s rental terms')).toBeNull();
    expect(screen.getByText('The venue’s rental terms')).toBeOnTheScreen();

    rerender(<RentalTermsConsent rentals={rentals({ venueTerms: '' })} />);
    expect(screen.getByText('Duncit’s rental terms')).toBeOnTheScreen();
    expect(screen.queryByText('The venue’s rental terms')).toBeNull();
  });

  it('names the terms without a link when neither side wrote any', () => {
    renderWithProviders(
      <RentalTermsConsent rentals={rentals({ settings: null, venueTerms: '' })} />,
    );
    expect(screen.queryByTestId('checkout-rental-terms')).toBeNull();
    expect(screen.getByText('rental terms')).toBeOnTheScreen();
  });
});
