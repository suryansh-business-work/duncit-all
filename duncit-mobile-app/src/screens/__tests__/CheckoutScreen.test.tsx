import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CheckoutScreen } from '@/screens/CheckoutScreen';
import { useCheckout } from '@/hooks/useCheckout';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useCheckout', () => ({ useCheckout: jest.fn() }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { podId: 'p1' } }),
}));

const mockedCheckout = useCheckout as jest.Mock;
const pay = jest.fn();
const downloadInvoice = jest.fn();
const finance = { platform_fee_pct: 10, gst_pct: 18, currency_symbol: '₹' };
const pod = { id: 'p1', pod_title: 'Pod', pod_amount: 500, pod_images_and_videos: [] };

function fill() {
  fireEvent.changeText(screen.getByTestId('field-email'), 'r@d.com');
  fireEvent.changeText(screen.getByTestId('field-phone_number'), '9876543210');
  fireEvent.changeText(screen.getByTestId('field-billing_address'), '12 Main Street, Pune');
}

beforeEach(() => {
  jest.clearAllMocks();
  pay.mockResolvedValue({
    id: 'pay1',
    invoice_no: 'INV-1',
    total: 500,
    currency_symbol: '₹',
    status: 'SUCCESS',
  });
  mockedCheckout.mockReturnValue({
    finance,
    pod,
    me: null,
    isLoading: false,
    pay,
    downloadInvoice,
  });
});

describe('CheckoutScreen', () => {
  it('shows the loader and the unavailable state', () => {
    mockedCheckout.mockReturnValue({
      finance: null,
      pod: null,
      me: null,
      isLoading: true,
      pay,
      downloadInvoice,
    });
    const { rerender } = renderWithProviders(<CheckoutScreen />);
    expect(screen.getByTestId('checkout-loading')).toBeOnTheScreen();

    mockedCheckout.mockReturnValue({
      finance: null,
      pod: null,
      me: null,
      isLoading: false,
      pay,
      downloadInvoice,
    });
    rerender(<CheckoutScreen />);
    expect(screen.getByTestId('checkout-unavailable')).toBeOnTheScreen();
  });

  it('pays and shows the success view', async () => {
    renderWithProviders(<CheckoutScreen />);
    expect(screen.getByTestId('order-summary')).toBeOnTheScreen();
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(pay).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('checkout-success')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('success-home'));
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });

  it('surfaces a failed payment', async () => {
    pay.mockResolvedValueOnce({ status: 'FAILED' });
    renderWithProviders(<CheckoutScreen />);
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('checkout-error')).toHaveTextContent(/Payment failed/),
    );
  });

  it('surfaces a thrown payment error', async () => {
    pay.mockRejectedValueOnce(new Error('gateway down'));
    renderWithProviders(<CheckoutScreen />);
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('checkout-error')).toHaveTextContent('gateway down'),
    );
  });
});
