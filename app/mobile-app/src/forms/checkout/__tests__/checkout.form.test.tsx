import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CheckoutForm } from '@/forms/checkout';
import { renderWithProviders } from '@/utils/test-utils';

function fillValid() {
  fireEvent.changeText(screen.getByTestId('field-full_name'), 'Riya Sharma');
  fireEvent.changeText(screen.getByTestId('field-email'), 'riya@duncit.com');
  fireEvent.changeText(screen.getByTestId('field-phone_number'), '9876543210');
  fireEvent.changeText(screen.getByTestId('field-line1'), '12 Main Street');
  fireEvent.changeText(screen.getByTestId('field-city'), 'Pune');
  fireEvent.changeText(screen.getByTestId('field-state'), 'Maharashtra');
  fireEvent.changeText(screen.getByTestId('field-pincode'), '411001');
}

describe('CheckoutForm', () => {
  it('renders the contact + billing sections', () => {
    renderWithProviders(<CheckoutForm onSubmit={jest.fn()} />);
    expect(screen.getByTestId('field-full_name')).toBeOnTheScreen();
    expect(screen.getByTestId('field-line1')).toBeOnTheScreen();
    expect(screen.getByTestId('field-billing_email')).toBeOnTheScreen();
    expect(screen.getByTestId('field-gstin')).toBeOnTheScreen();
  });

  it('blocks submit on invalid contact/billing details', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<CheckoutForm onSubmit={onSubmit} />);
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(screen.getByTestId('full_name-error')).toBeOnTheScreen());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid details and toggles save-as-main + simulate', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<CheckoutForm onSubmit={onSubmit} />);
    fillValid();
    fireEvent.press(screen.getByTestId('billing-save-as-main'));
    fireEvent.press(screen.getByTestId('simulate-failure'));
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      full_name: 'Riya Sharma',
      line1: '12 Main Street',
      save_as_main: true,
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
