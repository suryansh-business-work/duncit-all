import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CheckoutForm } from '@/forms/checkout';
import { renderWithProviders } from '@/utils/test-utils';

function fillValid() {
  fireEvent.changeText(screen.getByTestId('field-email'), 'riya@duncit.com');
  fireEvent.changeText(screen.getByTestId('field-phone_number'), '9876543210');
  fireEvent.changeText(screen.getByTestId('field-billing_address'), '12 Main Street, Pune');
}

describe('CheckoutForm', () => {
  it('renders contact fields', () => {
    renderWithProviders(<CheckoutForm onSubmit={jest.fn()} />);
    expect(screen.getByTestId('field-email')).toBeOnTheScreen();
    expect(screen.getByTestId('field-billing_address')).toBeOnTheScreen();
  });

  it('blocks submit on invalid contact details', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<CheckoutForm onSubmit={onSubmit} />);
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(screen.getByTestId('email-error')).toBeOnTheScreen());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('toggles simulate-failure and submits', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(
      <CheckoutForm onSubmit={onSubmit} initialValues={{ phone_extension: '+91' }} />,
    );
    fillValid();
    fireEvent.press(screen.getByTestId('simulate-failure'));
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      email: 'riya@duncit.com',
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

  it('hides the simulate toggle in live (Razorpay) mode', () => {
    renderWithProviders(<CheckoutForm onSubmit={jest.fn()} dummyMode={false} />);
    expect(screen.queryByTestId('simulate-failure')).toBeNull();
    expect(screen.getByText('Payments secured by Razorpay.')).toBeOnTheScreen();
  });
});
