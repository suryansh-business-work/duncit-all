import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CheckoutForm } from '@/forms/checkout';
import type { CheckoutFormValues } from '@/forms/checkout';
import { renderWithProviders } from '@/utils/test-utils';

// Contact is now read-only — it must be prefilled via initialValues, not typed.
const contact: Partial<CheckoutFormValues> = {
  full_name: 'Riya Sharma',
  email: 'riya@duncit.com',
  phone_extension: '+91',
  phone_number: '9876543210',
};

function fillBilling() {
  fireEvent.changeText(screen.getByTestId('field-line1'), '12 Main Street');
  fireEvent.changeText(screen.getByTestId('field-city'), 'Pune');
  fireEvent.changeText(screen.getByTestId('field-state'), 'Maharashtra');
  fireEvent.changeText(screen.getByTestId('field-pincode'), '411001');
}

describe('CheckoutForm', () => {
  it('renders the read-only contact summary + billing sections', () => {
    renderWithProviders(<CheckoutForm initialValues={contact} onSubmit={jest.fn()} />);
    expect(screen.getByTestId('checkout-contact-summary')).toBeOnTheScreen();
    expect(screen.getByText('Riya Sharma')).toBeOnTheScreen();
    expect(screen.getByText('+91 9876543210')).toBeOnTheScreen();
    expect(screen.getByText('To change these, edit your profile.')).toBeOnTheScreen();
    // The contact fields are no longer editable inputs.
    expect(screen.queryByTestId('field-full_name')).toBeNull();
    expect(screen.getByTestId('field-line1')).toBeOnTheScreen();
    expect(screen.getByTestId('field-billing_email')).toBeOnTheScreen();
  });

  it('blocks submit on invalid billing details', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<CheckoutForm initialValues={contact} onSubmit={onSubmit} />);
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(screen.getByTestId('line1-error')).toBeOnTheScreen());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid details and toggles save-as-main + simulate', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<CheckoutForm initialValues={contact} onSubmit={onSubmit} />);
    fillBilling();
    fireEvent.press(screen.getByTestId('billing-save-as-main'));
    fireEvent.press(screen.getByTestId('simulate-failure'));
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      full_name: 'Riya Sharma',
      line1: '12 Main Street',
      save_as_main: true,
      simulate_failure: true,
      has_gstin: false,
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
