import * as Clipboard from 'expo-clipboard';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { PaymentFailure } from '@duncit/utils';

import { PaymentFailureDialog } from '@/components/payment-failure';
import { fallbackT } from '@/i18n/fallback';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
// The claim sheet has its own suite; here it only has to open with the payment.
const mockSheet = jest.fn();
jest.mock('@/components/payment-failure/payment-claim/PaymentClaimSheet', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    PaymentClaimSheet: (p: { paymentDocId: string; onClose: () => void }) => {
      mockSheet(p);
      return (
        <Text testID="claim-sheet-stub" onPress={p.onClose}>
          {p.paymentDocId}
        </Text>
      );
    },
  };
});

const copy = Clipboard.setStringAsync as jest.Mock;

const failure = (over: Partial<PaymentFailure> = {}): PaymentFailure => ({
  kind: 'FAILED',
  code: 'BAD_REQUEST_ERROR',
  description: 'Your payment has been declined by the bank.',
  paymentId: 'pay_29QQoUBi66xm2f',
  orderId: 'order_1',
  raisesTicket: false,
  ...over,
});

const renderDialog = (over: Partial<Parameters<typeof PaymentFailureDialog>[0]> = {}) => {
  const props = {
    failure: failure(),
    ticketNo: null,
    ticketPending: false,
    ticketFailed: false,
    onRetry: jest.fn(),
    onClose: jest.fn(),
    ...over,
  };
  renderWithProviders(<PaymentFailureDialog {...props} />);
  return props;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PaymentFailureDialog — what it says', () => {
  it('renders nothing without a failure', () => {
    renderDialog({ failure: null });
    expect(screen.queryByTestId('payment-failure-dialog')).toBeNull();
  });

  it('names the outcome, the gateway reason and what happens to deducted money', () => {
    renderDialog();
    expect(screen.getByText(fallbackT('mweb.payment.failedTitle'))).toBeOnTheScreen();
    expect(
      screen.getByText(
        fallbackT('mweb.payment.gatewaySaid', {
          vars: { reason: 'Your payment has been declined by the bank.' },
        }),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('payment-deducted-notice')).toHaveTextContent(
      fallbackT('mweb.payment.deductedNotice'),
    );
    expect(screen.queryByText(fallbackT('mweb.payment.moneySafe'))).toBeNull();
  });

  it('shows the transaction id when Razorpay reported one, and hides the line when it did not', () => {
    renderDialog();
    expect(screen.getByTestId('payment-transaction-id')).toHaveTextContent(
      fallbackT('mweb.payment.transactionIdLabel', { vars: { id: 'pay_29QQoUBi66xm2f' } }),
    );
    screen.unmount();
    renderDialog({ failure: failure({ kind: 'CANCELLED', paymentId: null, description: null }) });
    expect(screen.queryByTestId('payment-transaction-id')).toBeNull();
    expect(screen.getByText(fallbackT('mweb.payment.cancelledTitle'))).toBeOnTheScreen();
  });

  it('copies the transaction id and confirms it', async () => {
    copy.mockResolvedValue(true);
    renderDialog();
    fireEvent.press(screen.getByTestId('payment-transaction-id-copy'));
    expect(copy).toHaveBeenCalledWith('pay_29QQoUBi66xm2f');
    await waitFor(() =>
      expect(screen.getByTestId('payment-transaction-id-copied')).toHaveTextContent(
        fallbackT('mweb.payment.transactionIdCopied'),
      ),
    );
  });

  it('does not claim a copy that failed', async () => {
    copy.mockRejectedValue(new Error('no clipboard'));
    renderDialog();
    fireEvent.press(screen.getByTestId('payment-transaction-id-copy'));
    await waitFor(() => expect(copy).toHaveBeenCalled());
    expect(screen.queryByTestId('payment-transaction-id-copied')).toBeNull();
  });

  it('quotes the ticket a timeout opened, and shows no ticket status for a decline', () => {
    renderDialog({ failure: failure({ kind: 'TIMEOUT', raisesTicket: true }), ticketNo: 'ST-42' });
    expect(screen.getByTestId('payment-ticket-no')).toHaveTextContent(
      fallbackT('mweb.payment.ticketRaised', { vars: { ticket: 'ST-42' } }),
    );
    screen.unmount();
    renderDialog();
    expect(screen.queryByTestId('payment-ticket-status')).toBeNull();
  });
});

describe('PaymentFailureDialog — support and actions', () => {
  it('hides the Support section when the screen grants no claim (gift cards, products)', () => {
    renderDialog();
    expect(screen.queryByTestId('payment-support-section')).toBeNull();
  });

  it('opens the deduction claim for the pod payment from the Support section, and closes it', () => {
    renderDialog({ claim: { paymentDocId: 'doc9' } });
    expect(screen.getByText(fallbackT('mweb.payment.supportHeading'))).toBeOnTheScreen();
    expect(screen.queryByTestId('claim-sheet-stub')).toBeNull();
    fireEvent.press(screen.getByTestId('payment-deducted-open'));
    expect(mockSheet).toHaveBeenCalledWith(expect.objectContaining({ paymentDocId: 'doc9' }));
    fireEvent.press(screen.getByTestId('claim-sheet-stub'));
    expect(screen.queryByTestId('claim-sheet-stub')).toBeNull();
  });

  it('retries and closes through the bottom actions', () => {
    const { onRetry, onClose } = renderDialog();
    fireEvent.press(screen.getByTestId('payment-failure-retry'));
    fireEvent.press(screen.getByTestId('payment-failure-close'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
