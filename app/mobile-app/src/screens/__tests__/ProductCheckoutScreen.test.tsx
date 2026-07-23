import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ProductCheckoutScreen } from '@/screens/ProductCheckoutScreen';
import { useProductCheckout } from '@/hooks/useProductCheckout';
import { useProductShippingQuote } from '@/hooks/useProductShippingQuote';
import { useCartStore, type CartLine } from '@/stores/cart.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useProductCheckout', () => ({ useProductCheckout: jest.fn() }));
jest.mock('@/hooks/useProductShippingQuote', () => ({ useProductShippingQuote: jest.fn() }));
jest.mock('@/services/cart', () => ({
  ...jest.requireActual('@/services/cart'),
  getCartLines: jest.fn().mockResolvedValue([]),
  setCartLines: jest.fn().mockResolvedValue(undefined),
}));
// buildCheckoutContact is imported from the real useCheckout, which pulls these
// native modules in transitively.
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  writeAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
}));

const mockedCheckout = useProductCheckout as jest.Mock;
const mockedShipping = useProductShippingQuote as jest.Mock;
const payProduct = jest.fn();
const createRazorpayProductOrder = jest.fn();
const verifyRazorpay = jest.fn();
const previewCoupon = jest.fn();
const downloadInvoice = jest.fn();
const finance = { platform_fee_pct: 10, gst_pct: 18, currency_symbol: '₹', dummy_mode: true };
const order = {
  payment_doc_id: 'd1',
  key_id: 'rzp',
  order_id: 'order_1',
  amount: 20000,
  currency: 'INR',
  name: 'Duncit',
  description: 'desc',
  prefill_email: '',
  prefill_contact: '',
  currency_symbol: '₹',
  total: 200,
};

const contactValues = {
  full_name: 'Riya Sharma',
  email: 'r@d.com',
  phone_extension: '+91',
  phone_number: '9876543210',
};

const line = (over: Partial<CartLine> = {}): CartLine => ({
  pod_id: 'p1',
  pod_title: 'Sunset Jam',
  club_slug: 'c1',
  product_id: 'a',
  variant_id: '',
  variant_label: '',
  product_name: 'Alpha Tee',
  image_url: '',
  unit_cost: 100,
  quantity: 2,
  max_quantity: 5,
  ...over,
});

function fill() {
  fireEvent.changeText(screen.getByTestId('field-line1'), '12 Main Street');
  fireEvent.changeText(screen.getByTestId('field-city'), 'Pune');
  fireEvent.changeText(screen.getByTestId('field-state'), 'Maharashtra');
  fireEvent.changeText(screen.getByTestId('field-pincode'), '411001');
}

const baseHook = (overrides: Record<string, unknown> = {}) => ({
  finance,
  me: null,
  initialValues: contactValues,
  availableCoupons: [],
  isLoading: false,
  payProduct,
  createRazorpayProductOrder,
  verifyRazorpay,
  previewCoupon,
  downloadInvoice,
  ...overrides,
});

const liveHook = () =>
  baseHook({ finance: { ...finance, dummy_mode: false, razorpay_enabled: true } });

async function fireRazorpaySuccess() {
  const frame = await screen.findByTestId('razorpay-webview-frame');
  fireEvent(frame, 'message', {
    nativeEvent: {
      data: JSON.stringify({
        type: 'success',
        razorpay_order_id: 'o',
        razorpay_payment_id: 'p',
        razorpay_signature: 's',
      }),
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  useCartStore.setState({ lines: [line()], hydrated: true });
  payProduct.mockResolvedValue({
    id: 'pay1',
    invoice_no: 'INV-1',
    total: 200,
    currency_symbol: '₹',
    status: 'SUCCESS',
  });
  mockedShipping.mockReturnValue({ quote: null, loading: false, pincodeValid: false });
  mockedCheckout.mockReturnValue(baseHook());
});

describe('ProductCheckoutScreen', () => {
  it('shows the empty state and routes back to the cart when no lines remain', () => {
    useCartStore.setState({ lines: [], hydrated: true });
    renderWithProviders(<ProductCheckoutScreen />);
    expect(screen.getByTestId('product-checkout-empty')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('product-checkout-back-to-cart'));
    expect(mockNavigate).toHaveBeenCalledWith('Cart');
  });

  it("checks out EVERY pod's cart lines together, grouped by pod", () => {
    useCartStore.setState({
      lines: [
        line(),
        line({
          pod_id: 'p2',
          pod_title: 'Beach Bash',
          product_id: 'b',
          product_name: 'Beta Mug',
          unit_cost: 80,
          quantity: 1,
        }),
      ],
      hydrated: true,
    });
    renderWithProviders(<ProductCheckoutScreen />);
    expect(screen.getByTestId('summary-pod-p1')).toHaveTextContent('Sunset Jam');
    expect(screen.getByTestId('summary-pod-p2')).toHaveTextContent('Beach Bash');
    expect(screen.getByText('Alpha Tee × 2')).toBeOnTheScreen();
    expect(screen.getByText('Beta Mug × 1')).toBeOnTheScreen();
  });

  it('shows a spinner in the contact card while the profile is still loading', () => {
    mockedCheckout.mockReturnValue(baseHook({ isLoading: true, me: null }));
    renderWithProviders(<ProductCheckoutScreen />);
    expect(screen.getByTestId('checkout-contact-loading')).toBeOnTheScreen();
  });

  it('shows the loader while finance is still loading', () => {
    mockedCheckout.mockReturnValue(baseHook({ finance: null, isLoading: true }));
    renderWithProviders(<ProductCheckoutScreen />);
    expect(screen.getByTestId('product-checkout-loading')).toBeOnTheScreen();
  });

  it('shows the unavailable state when finance never resolves', () => {
    mockedCheckout.mockReturnValue(baseHook({ finance: null, isLoading: false }));
    renderWithProviders(<ProductCheckoutScreen />);
    expect(screen.getByTestId('product-checkout-unavailable')).toBeOnTheScreen();
  });

  it('renders the product-only summary (no pod ticket line)', () => {
    renderWithProviders(<ProductCheckoutScreen />);
    expect(screen.getByTestId('product-order-summary')).toBeOnTheScreen();
    expect(screen.getByText('Alpha Tee × 2')).toBeOnTheScreen();
    expect(screen.queryByText('Ticket price')).toBeNull();
  });

  it('pays via the dummy engine, clears the whole cart and opens the orders history', async () => {
    useCartStore.setState({
      lines: [line(), line({ pod_id: 'p2', product_id: 'b', product_name: 'Beta Mug' })],
      hydrated: true,
    });
    renderWithProviders(<ProductCheckoutScreen />);
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(payProduct).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('checkout-success')).toBeOnTheScreen());
    // EVERY cart line (all pods) is cleared on success — one combined payment.
    expect(useCartStore.getState().lines).toEqual([]);
    expect(screen.getByText('My orders')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('success-profile'));
    expect(mockNavigate).toHaveBeenCalledWith('OrdersHistory');
    fireEvent.press(screen.getByTestId('success-home'));
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });

  it('surfaces a failed dummy payment', async () => {
    payProduct.mockResolvedValueOnce({ status: 'FAILED' });
    renderWithProviders(<ProductCheckoutScreen />);
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('checkout-error')).toHaveTextContent(/Payment failed/),
    );
  });

  it('surfaces a thrown payment error', async () => {
    payProduct.mockRejectedValueOnce(new Error('gateway down'));
    renderWithProviders(<ProductCheckoutScreen />);
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
    renderWithProviders(<ProductCheckoutScreen />);
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('checkout-error')).toHaveTextContent(/not configured/i),
    );
    expect(createRazorpayProductOrder).not.toHaveBeenCalled();
  });

  it('runs the Razorpay flow: order → verify → success', async () => {
    createRazorpayProductOrder.mockResolvedValue(order);
    verifyRazorpay.mockResolvedValue({
      id: 'pay2',
      invoice_no: 'INV-2',
      total: 200,
      currency_symbol: '₹',
      status: 'SUCCESS',
    });
    mockedCheckout.mockReturnValue(liveHook());
    renderWithProviders(<ProductCheckoutScreen />);
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(createRazorpayProductOrder).toHaveBeenCalled());
    await fireRazorpaySuccess();
    await waitFor(() => expect(verifyRazorpay).toHaveBeenCalledWith('d1', expect.any(Object)));
    await waitFor(() => expect(screen.getByTestId('checkout-success')).toBeOnTheScreen());
  });

  it('surfaces a non-success Razorpay verification', async () => {
    createRazorpayProductOrder.mockResolvedValue(order);
    verifyRazorpay.mockResolvedValueOnce({ status: 'FAILED' });
    mockedCheckout.mockReturnValue(liveHook());
    renderWithProviders(<ProductCheckoutScreen />);
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await fireRazorpaySuccess();
    await waitFor(() =>
      expect(screen.getByTestId('checkout-error')).toHaveTextContent(/could not be verified/i),
    );
  });

  it('surfaces a thrown Razorpay verification error', async () => {
    createRazorpayProductOrder.mockResolvedValue(order);
    verifyRazorpay.mockRejectedValueOnce(new Error('verify boom'));
    mockedCheckout.mockReturnValue(liveHook());
    renderWithProviders(<ProductCheckoutScreen />);
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await fireRazorpaySuccess();
    await waitFor(() =>
      expect(screen.getByTestId('checkout-error')).toHaveTextContent('verify boom'),
    );
  });

  it('shows a cancellation message when the Razorpay sheet is dismissed', async () => {
    createRazorpayProductOrder.mockResolvedValue(order);
    mockedCheckout.mockReturnValue(liveHook());
    renderWithProviders(<ProductCheckoutScreen />);
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    const frame = await screen.findByTestId('razorpay-webview-frame');
    fireEvent(frame, 'message', { nativeEvent: { data: JSON.stringify({ type: 'dismiss' }) } });
    await waitFor(() =>
      expect(screen.getByTestId('checkout-error')).toHaveTextContent(/cancelled/i),
    );
  });

  it('completes a 100%-off coupon for free without the gateway sheet', async () => {
    createRazorpayProductOrder.mockResolvedValue({
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
    mockedCheckout.mockReturnValue(liveHook());
    renderWithProviders(<ProductCheckoutScreen />);
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(screen.getByTestId('checkout-success')).toBeOnTheScreen());
    expect(screen.queryByTestId('razorpay-webview-frame')).toBeNull();
  });

  it('applies a coupon (from a valid code), then clears it', async () => {
    previewCoupon.mockResolvedValue({
      ok: true,
      message: null,
      code: 'TEN',
      discount_pct: 10,
      original_total: 200,
      discount_amount: 20,
      final_total: 180,
      currency_symbol: '₹',
    });
    renderWithProviders(<ProductCheckoutScreen />);
    fireEvent.changeText(screen.getByTestId('coupon-input'), 'TEN');
    fireEvent.press(screen.getByTestId('coupon-apply'));
    await waitFor(() => expect(previewCoupon).toHaveBeenCalledWith('TEN', 200));
    expect(screen.getByTestId('coupon-total')).toBeOnTheScreen();
    // Pay carries the applied code through to the product engine.
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() =>
      expect(payProduct).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ couponCode: 'TEN' }),
      ),
    );
  });

  it('applies a coupon the server accepts without echoing a code (pays with null)', async () => {
    previewCoupon.mockResolvedValue({
      ok: true,
      message: null,
      code: null,
      discount_pct: 5,
      original_total: 200,
      discount_amount: 10,
      final_total: 190,
      currency_symbol: '₹',
    });
    renderWithProviders(<ProductCheckoutScreen />);
    fireEvent.changeText(screen.getByTestId('coupon-input'), 'FREESHIP');
    fireEvent.press(screen.getByTestId('coupon-apply'));
    await waitFor(() => expect(screen.getByTestId('coupon-total')).toBeOnTheScreen());
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() =>
      expect(payProduct).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ couponCode: null }),
      ),
    );
  });

  it('ignores an empty coupon code', () => {
    renderWithProviders(<ProductCheckoutScreen />);
    fireEvent.press(screen.getByTestId('coupon-apply'));
    expect(previewCoupon).not.toHaveBeenCalled();
  });

  it('surfaces an invalid coupon and a thrown coupon error, then removes it', async () => {
    previewCoupon
      .mockResolvedValueOnce({ ok: false, message: null })
      .mockRejectedValueOnce(new Error('coupon service down'))
      .mockResolvedValue({
        ok: true,
        message: null,
        code: 'TEN',
        discount_pct: 10,
        original_total: 200,
        discount_amount: 20,
        final_total: 180,
        currency_symbol: '₹',
      });
    renderWithProviders(<ProductCheckoutScreen />);
    fireEvent.changeText(screen.getByTestId('coupon-input'), 'BAD');
    fireEvent.press(screen.getByTestId('coupon-apply'));
    await waitFor(() =>
      expect(screen.getByTestId('coupon-error')).toHaveTextContent('Invalid coupon code'),
    );
    fireEvent.press(screen.getByTestId('coupon-apply'));
    await waitFor(() =>
      expect(screen.getByTestId('coupon-error')).toHaveTextContent('coupon service down'),
    );
    fireEvent.press(screen.getByTestId('coupon-apply'));
    await waitFor(() => expect(screen.getByTestId('coupon-applied')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('coupon-remove'));
    await waitFor(() => expect(screen.queryByTestId('coupon-applied')).toBeNull());
  });

  it('downloads the invoice from the success view', async () => {
    downloadInvoice.mockResolvedValue(undefined);
    payProduct.mockResolvedValueOnce({
      id: 'pay1',
      invoice_no: null,
      total: 200,
      currency_symbol: '₹',
      status: 'SUCCESS',
    });
    renderWithProviders(<ProductCheckoutScreen />);
    fill();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(screen.getByTestId('checkout-success')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('download-invoice'));
    await waitFor(() => expect(downloadInvoice).toHaveBeenCalledWith('pay1', 'invoice'));
    // Product success view never offers a pod ticket download.
    expect(screen.queryByTestId('download-ticket')).toBeNull();
  });
});
