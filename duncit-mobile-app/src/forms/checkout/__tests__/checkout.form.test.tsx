import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CheckoutForm } from '@/forms/checkout';
import { renderWithProviders } from '@/utils/test-utils';

function fillValid() {
  fireEvent.changeText(screen.getByTestId('field-email'), 'riya@duncit.com');
  fireEvent.changeText(screen.getByTestId('field-phone_number'), '9876543210');
  fireEvent.changeText(screen.getByTestId('field-billing_address'), '12 Main Street, Pune');
}

describe('CheckoutForm', () => {
  it('renders contact fields and the payment methods', () => {
    renderWithProviders(<CheckoutForm onSubmit={jest.fn()} />);
    expect(screen.getByTestId('field-email')).toBeOnTheScreen();
    expect(screen.getByTestId('pay-method-DUMMY_UPI')).toBeOnTheScreen();
  });

  it('blocks submit on invalid contact details', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<CheckoutForm onSubmit={onSubmit} />);
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(screen.getByTestId('email-error')).toBeOnTheScreen());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('selects a method, toggles simulate-failure and submits', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(
      <CheckoutForm onSubmit={onSubmit} initialValues={{ phone_extension: '+91' }} />,
    );
    fillValid();
    fireEvent.press(screen.getByTestId('pay-method-DUMMY_CARD'));
    fireEvent.press(screen.getByTestId('simulate-failure'));
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      email: 'riya@duncit.com',
      method: 'DUMMY_CARD',
      simulate_failure: true,
    });
  });

  it('renders an error message + loading label', () => {
    renderWithProviders(
      <CheckoutForm onSubmit={jest.fn()} errorMessage="Payment failed" loading />,
    );
    expect(screen.getByTestId('checkout-error')).toHaveTextContent('Payment failed');
    expect(screen.getByTestId('checkout-submit')).toBeOnTheScreen();
  });
});
