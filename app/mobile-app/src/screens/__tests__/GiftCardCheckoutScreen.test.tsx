import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { GiftCardCheckoutScreen } from '@/screens/GiftCardCheckoutScreen';
import { useGiftCardCheckout } from '@/hooks/useGiftCardCheckout';
import { fallbackT } from '@/i18n/fallback';
import { graphqlRequest } from '@/services/graphql.client';
import type { GiftCardSelection } from '@/utils/gift-cards';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useGiftCardCheckout', () => ({ useGiftCardCheckout: jest.fn() }));
// The payment-failure ticket and the address picker both read via graphqlRequest.
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
// buildCheckoutContact is imported from the real useCheckout, which pulls these
// native modules in transitively.
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  writeAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

const mockNavigate = jest.fn();
let mockSelection: GiftCardSelection;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { selection: mockSelection } }),
}));

const mockedCheckout = useGiftCardCheckout as jest.Mock;
const mockRequest = graphqlRequest as jest.Mock;
const pay = jest.fn();
const createRazorpayGiftCardOrder = jest.fn();
const verifyRazorpay = jest.fn();
const downloadInvoice = jest.fn();

const finance = { currency_symbol: '₹', dummy_mode: true, razorpay_enabled: false };
const contactValues = {
  full_name: 'Riya Sharma',
  email: 'r@d.com',
  phone_extension: '+91',
  phone_number: '9876543210',
};
const order = {
  payment_doc_id: 'd1',
  key_id: 'rzp',
  order_id: 'order_1',
  amount: 50000,
  currency: 'INR',
  name: 'Duncit',
  description: 'Gift card',
  prefill_email: '',
  prefill_contact: '',
  currency_symbol: '₹',
  total: 500,
};
const success = {
  id: 'pay1',
  invoice_no: 'INV-1',
  total: 500,
  currency_symbol: '₹',
  status: 'SUCCESS',
  paid_at: '2030-01-01T10:00:00.000Z',
  created_at: '2030-01-01T10:00:00.000Z',
};

const selection = (over: Partial<GiftCardSelection> = {}): GiftCardSelection => ({
  scope_type: 'SHOP',
  scope_category_id: null,
  scope_name: 'Pet Lovers',
  scope_image_url: '',
  scope_image_front_url: '',
  scope_image_back_url: '',
  amount: 500,
  recipient_email: 'friend@example.com',
  recipient_name: 'Friend',
  message: 'Enjoy',
  ...over,
});

const hook = (overrides: Record<string, unknown> = {}) => ({
  finance,
  me: null,
  initialValues: contactValues,
  isLoading: false,
  pay,
  createRazorpayGiftCardOrder,
  verifyRazorpay,
  confirmingMessage: 'Confirming…',
  downloadInvoice,
  ...overrides,
});
const liveHook = () => hook({ finance: { ...finance, dummy_mode: false, razorpay_enabled: true } });

function fill() {
  fireEvent.changeText(screen.getByTestId('field-line1'), '12 Main Street');
  fireEvent.changeText(screen.getByTestId('field-city'), 'Pune');
  fireEvent.changeText(screen.getByTestId('field-state'), 'Maharashtra');
  fireEvent.changeText(screen.getByTestId('field-pincode'), '411001');
}

function submit() {
  renderWithProviders(<GiftCardCheckoutScreen />);
  fill();
  fireEvent.press(screen.getByTestId('checkout-submit'));
}

async function postToRazorpay(data: Record<string, unknown>) {
  const frame = await screen.findByTestId('razorpay-webview-frame');
  fireEvent(frame, 'message', { nativeEvent: { data: JSON.stringify(data) } });
}
const razorpaySuccess = () =>
  postToRazorpay({
    type: 'success',
    razorpay_order_id: 'o',
    razorpay_payment_id: 'p',
    razorpay_signature: 's',
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockSelection = selection();
  mockedCheckout.mockReturnValue(hook());
  pay.mockResolvedValue(success);
  mockRequest.mockResolvedValue({ myAddresses: [] });
});

describe('GiftCardCheckoutScreen — summary', () => {
  it('shows the spinner while finance is still loading', () => {
    mockedCheckout.mockReturnValue(hook({ finance: null, isLoading: true }));
    renderWithProviders(<GiftCardCheckoutScreen />);
    expect(screen.getByTestId('gift-card-checkout-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('checkout-submit')).toBeNull();
  });

  it('summarises the theme, recipient and face value', () => {
    renderWithProviders(<GiftCardCheckoutScreen />);
    expect(mockedCheckout).toHaveBeenCalledWith(mockSelection);
    expect(screen.getAllByText('Pet Lovers').length).toBeGreaterThan(0);
    expect(screen.getAllByText('friend@example.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹500.00').length).toBeGreaterThan(0);
  });

  it('falls back to the shop theme and the buyer when neither is named', () => {
    mockSelection = selection({ scope_name: '', recipient_email: '' });
    renderWithProviders(<GiftCardCheckoutScreen />);
    expect(screen.getAllByText(fallbackT('mweb.giftCards.shopTheme')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(fallbackT('mweb.giftCards.checkoutSelf')).length).toBeGreaterThan(0);
  });

  it('still renders the form when finance never arrives', () => {
    mockedCheckout.mockReturnValue(hook({ finance: null, isLoading: false }));
    renderWithProviders(<GiftCardCheckoutScreen />);
    expect(screen.getByTestId('checkout-submit')).toBeOnTheScreen();
  });
});

describe('GiftCardCheckoutScreen — dummy engine', () => {
  it('pays, then offers the cards, home and the invoice', async () => {
    submit();
    await waitFor(() => expect(screen.getByTestId('gift-card-purchase-success')).toBeOnTheScreen());
    expect(pay).toHaveBeenCalledWith(expect.objectContaining({ line1: '12 Main Street' }));

    fireEvent.press(screen.getByTestId('gift-card-success-my-cards'));
    expect(mockNavigate).toHaveBeenCalledWith('GiftCards');
    fireEvent.press(screen.getByTestId('gift-card-success-home'));
    expect(mockNavigate).toHaveBeenCalledWith('Home');

    downloadInvoice.mockResolvedValue(undefined);
    fireEvent.press(screen.getByTestId('gift-card-download-invoice'));
    await waitFor(() => expect(downloadInvoice).toHaveBeenCalledWith('pay1', 'INV-1'));
  });

  it('names the invoice file "invoice" when the payment has no number', async () => {
    pay.mockResolvedValueOnce({ ...success, invoice_no: null });
    downloadInvoice.mockResolvedValue(undefined);
    submit();
    await waitFor(() => expect(screen.getByTestId('gift-card-purchase-success')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('gift-card-download-invoice'));
    await waitFor(() => expect(downloadInvoice).toHaveBeenCalledWith('pay1', 'invoice'));
  });

  it('surfaces a payment the engine did not complete', async () => {
    pay.mockResolvedValueOnce({ status: 'FAILED' });
    submit();
    await waitFor(() =>
      expect(screen.getByTestId('checkout-error')).toHaveTextContent(
        fallbackT('mweb.giftCards.failureBody'),
      ),
    );
  });

  it('surfaces a thrown payment error', async () => {
    pay.mockRejectedValueOnce(new Error('gateway down'));
    submit();
    await waitFor(() =>
      expect(screen.getByTestId('checkout-error')).toHaveTextContent('gateway down'),
    );
  });

  it('defaults to the dummy engine when finance does not say', async () => {
    mockedCheckout.mockReturnValue(hook({ finance: { currency_symbol: '₹' } }));
    submit();
    await waitFor(() => expect(pay).toHaveBeenCalledTimes(1));
  });

  it('refuses to charge when live mode has no gateway configured', async () => {
    mockedCheckout.mockReturnValue(hook({ finance: { ...finance, dummy_mode: false } }));
    submit();
    await waitFor(() =>
      expect(screen.getByTestId('checkout-error')).toHaveTextContent(
        fallbackT('mweb.checkout.errorNotConfigured'),
      ),
    );
    expect(pay).not.toHaveBeenCalled();
    expect(createRazorpayGiftCardOrder).not.toHaveBeenCalled();
  });
});

describe('GiftCardCheckoutScreen — Razorpay', () => {
  beforeEach(() => {
    mockedCheckout.mockReturnValue(liveHook());
    createRazorpayGiftCardOrder.mockResolvedValue(order);
  });

  it('runs order → verify → success', async () => {
    verifyRazorpay.mockResolvedValue(success);
    submit();
    await razorpaySuccess();
    await waitFor(() =>
      expect(verifyRazorpay).toHaveBeenCalledWith('d1', {
        razorpay_order_id: 'o',
        razorpay_payment_id: 'p',
        razorpay_signature: 's',
      }),
    );
    await waitFor(() => expect(screen.getByTestId('gift-card-purchase-success')).toBeOnTheScreen());
    expect(pay).not.toHaveBeenCalled();
  });

  it('surfaces a verification that did not succeed', async () => {
    verifyRazorpay.mockResolvedValueOnce(null);
    submit();
    await razorpaySuccess();
    await waitFor(() =>
      expect(screen.getByTestId('checkout-error')).toHaveTextContent(
        fallbackT('mweb.checkout.errorNotVerified'),
      ),
    );
  });

  it('surfaces a thrown verification error', async () => {
    verifyRazorpay.mockRejectedValueOnce(new Error('verify boom'));
    submit();
    await razorpaySuccess();
    await waitFor(() =>
      expect(screen.getByTestId('checkout-error')).toHaveTextContent('verify boom'),
    );
  });

  it('shows the failure dialog when the sheet is closed, and retry clears it', async () => {
    submit();
    await postToRazorpay({ type: 'dismiss' });
    expect(await screen.findByTestId('payment-failure-dialog')).toBeOnTheScreen();
    expect(mockRequest).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ input: expect.objectContaining({ subject: expect.any(String) }) }),
      expect.anything(),
    );
    fireEvent.press(screen.getByTestId('payment-failure-retry'));
    await waitFor(() => expect(screen.queryByTestId('payment-failure-dialog')).toBeNull());
    expect(screen.queryByTestId('checkout-error')).toBeNull();
  });

  it('raises a support ticket for a timed-out payment and quotes its number', async () => {
    mockRequest.mockImplementation((_doc: unknown, vars?: { input?: { subject?: string } }) =>
      vars?.input?.subject
        ? Promise.resolve({ createTicket: { id: 't1', ticket_no: 'TCK-9' } })
        : Promise.resolve({ myAddresses: [] }),
    );
    submit();
    await postToRazorpay({ type: 'failed', error: { reason: 'payment_timeout' } });
    await waitFor(() => expect(screen.getByTestId('payment-ticket-no')).toBeOnTheScreen());
    expect(screen.getByTestId('payment-ticket-no')).toHaveTextContent(/TCK-9/);
    fireEvent.press(screen.getByTestId('payment-failure-close'));
    await waitFor(() => expect(screen.queryByTestId('payment-failure-dialog')).toBeNull());
  });
});
