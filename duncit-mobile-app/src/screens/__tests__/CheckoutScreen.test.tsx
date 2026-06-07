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
const createRazorpayOrder = jest.fn();
const verifyRazorpay = jest.fn();
const previewCoupon = jest.fn();
const downloadInvoice = jest.fn();
const finance = { platform_fee_pct: 10, gst_pct: 18, currency_symbol: '₹', dummy_mode: true };
const pod = { id: 'p1', pod_title: 'Pod', pod_amount: 500, pod_images_and_videos: [] };
const order = {
  payment_doc_id: 'd1',
  key_id: 'rzp',
  order_id: 'order_1',
  amount: 59000,
  currency: 'INR',
  name: 'Duncit',
  description: 'desc',
  prefill_email: '',
  prefill_contact: '',
  currency_symbol: '₹',
  total: 590,
};

function fill() {
  fireEvent.changeText(screen.getByTestId('field-email'), 'r@d.com');
  fireEvent.changeText(screen.getByTestId('field-phone_number'), '9876543210');
  fireEvent.changeText(screen.getByTestId('field-billing_address'), '12 Main Street, Pune');
}

const baseHook = (overrides: Record<string, unknown> = {}) => ({
  finance,
  pod,
  me: null,
  isLoading: false,
  pay,
  createRazorpayOrder,
  verifyRazorpay,
  previewCoupon,
  downloadInvoice,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  pay.mockResolvedValue({
    id: 'pay1',
    invoice_no: 'INV-1',
    total: 500,
    currency_symbol: '₹',
    status: 'SUCCESS',
  });
  mockedCheckout.mockReturnValue(baseHook());
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

  it('errors when live mode is on but Razorpay is not configured', async () => {
    mockedCheckout.mockReturnValue(
      baseHook({ finance: { ...finance, dummy_mode: false, razorpay_enabled: false } }),
    );
    renderWithProviders(<CheckoutScreen />);
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('checkout-error')).toHaveTextContent(/not configured/i),
    );
    expect(createRazorpayOrder).not.toHaveBeenCalled();
  });

  it('runs the Razorpay flow: order → verify → success', async () => {
    createRazorpayOrder.mockResolvedValue(order);
    verifyRazorpay.mockResolvedValue({
      id: 'pay1',
      invoice_no: 'INV-2',
      total: 590,
      currency_symbol: '₹',
      status: 'SUCCESS',
    });
    mockedCheckout.mockReturnValue(
      baseHook({ finance: { ...finance, dummy_mode: false, razorpay_enabled: true } }),
    );
    renderWithProviders(<CheckoutScreen />);
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(createRazorpayOrder).toHaveBeenCalled());
    const frame = await screen.findByTestId('razorpay-webview-frame');
    fireEvent(frame, 'message', {
      nativeEvent: {
        data: JSON.stringify({
          type: 'success',
          razorpay_order_id: 'order_1',
          razorpay_payment_id: 'pay_1',
          razorpay_signature: 'sig_1',
        }),
      },
    });
    await waitFor(() => expect(verifyRazorpay).toHaveBeenCalledWith('d1', expect.any(Object)));
    await waitFor(() => expect(screen.getByTestId('checkout-success')).toBeOnTheScreen());
  });

  it('shows a cancellation message when the Razorpay sheet is dismissed', async () => {
    createRazorpayOrder.mockResolvedValue(order);
    mockedCheckout.mockReturnValue(
      baseHook({ finance: { ...finance, dummy_mode: false, razorpay_enabled: true } }),
    );
    renderWithProviders(<CheckoutScreen />);
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    const frame = await screen.findByTestId('razorpay-webview-frame');
    fireEvent(frame, 'message', { nativeEvent: { data: JSON.stringify({ type: 'dismiss' }) } });
    await waitFor(() =>
      expect(screen.getByTestId('checkout-error')).toHaveTextContent(/cancelled/i),
    );
  });

  it('applies a coupon and pays the discounted total via the dummy gateway', async () => {
    previewCoupon.mockResolvedValue({
      ok: true,
      message: null,
      code: 'TEN',
      discount_pct: 10,
      original_total: 500,
      discount_amount: 50,
      final_total: 450,
      currency_symbol: '₹',
    });
    renderWithProviders(<CheckoutScreen />);
    fireEvent.changeText(screen.getByTestId('coupon-input'), 'TEN');
    fireEvent.press(screen.getByTestId('coupon-apply'));
    await waitFor(() => expect(screen.getByTestId('coupon-applied')).toBeOnTheScreen());
    expect(screen.getByTestId('coupon-total')).toBeOnTheScreen();
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(pay).toHaveBeenCalledWith(expect.anything(), 500, 'TEN'));
  });

  it('surfaces an invalid coupon', async () => {
    previewCoupon.mockResolvedValueOnce({ ok: false, message: 'Coupon has expired' });
    renderWithProviders(<CheckoutScreen />);
    fireEvent.changeText(screen.getByTestId('coupon-input'), 'BAD');
    fireEvent.press(screen.getByTestId('coupon-apply'));
    await waitFor(() => expect(screen.getByTestId('coupon-error')).toHaveTextContent(/expired/i));
  });

  it('completes a 100%-off coupon for free without the gateway sheet', async () => {
    createRazorpayOrder.mockResolvedValue({
      ...order,
      free: true,
      payment: {
        id: 'pay-free',
        invoice_no: 'INV-F',
        total: 0,
        currency_symbol: '₹',
        status: 'SUCCESS',
      },
    });
    mockedCheckout.mockReturnValue(
      baseHook({ finance: { ...finance, dummy_mode: false, razorpay_enabled: true } }),
    );
    renderWithProviders(<CheckoutScreen />);
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(screen.getByTestId('checkout-success')).toBeOnTheScreen());
    expect(screen.queryByTestId('razorpay-webview-frame')).toBeNull();
  });
});
