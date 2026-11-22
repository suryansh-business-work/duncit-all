import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentFailure } from '@duncit/utils';
import { fallbackT } from '../../../i18n/fallback';
import PaymentFailureDialog from '../PaymentFailureDialog';

const h = vi.hoisted(() => ({ copy: vi.fn(), claimProps: undefined as undefined | Record<string, any> }));
vi.mock('@duncit/utils', async (orig) => ({ ...(await orig<object>()), copyToClipboard: h.copy }));
// The claim dialog has its own suite; here it only has to open with the payment.
vi.mock('../PaymentClaimDialog', () => ({
  default: (p: Record<string, any>) => {
    h.claimProps = p;
    return <button type="button" data-testid="claim-dialog-stub" onClick={p.onClose} />;
  },
}));

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
    onRetry: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  render(<PaymentFailureDialog {...props} />);
  return props;
};

beforeEach(() => {
  h.copy.mockReset();
  h.claimProps = undefined;
});

describe('PaymentFailureDialog — what it says', () => {
  it('renders nothing without a failure', () => {
    renderDialog({ failure: null });
    expect(screen.queryByTestId('payment-failure-dialog')).not.toBeInTheDocument();
  });

  it('names the outcome, the gateway reason and what happens to deducted money', () => {
    renderDialog();
    expect(screen.getByText(fallbackT('mweb.payment.failedTitle'))).toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.payment.failedBody'))).toBeInTheDocument();
    expect(
      screen.getByText(fallbackT('mweb.payment.gatewaySaid', { vars: { reason: 'Your payment has been declined by the bank.' } })),
    ).toBeInTheDocument();
    expect(screen.getByTestId('payment-deducted-notice')).toHaveTextContent(fallbackT('mweb.payment.deductedNotice'));
    // The old 7–10 day promise is gone from this dialog.
    expect(screen.queryByText(fallbackT('mweb.payment.moneySafe'))).not.toBeInTheDocument();
  });

  it('shows the transaction id when Razorpay reported one, and hides the line when it did not', () => {
    renderDialog();
    expect(screen.getByTestId('payment-transaction-id')).toHaveTextContent(
      fallbackT('mweb.payment.transactionIdLabel', { vars: { id: 'pay_29QQoUBi66xm2f' } }),
    );
    cleanup();
    renderDialog({ failure: failure({ kind: 'CANCELLED', paymentId: null, description: null }) });
    expect(screen.queryByTestId('payment-transaction-id')).not.toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.payment.cancelledTitle'))).toBeInTheDocument();
  });

  it('copies the transaction id and says so only when the copy landed', async () => {
    h.copy.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderDialog();
    const copy = screen.getByRole('button', { name: fallbackT('mweb.payment.copyTransactionId') });
    await act(async () => fireEvent.click(copy));
    expect(h.copy).toHaveBeenCalledWith('pay_29QQoUBi66xm2f');
    expect(screen.queryByText(fallbackT('mweb.payment.transactionIdCopied'))).not.toBeInTheDocument();
    await act(async () => fireEvent.click(copy));
    expect(screen.getByText(fallbackT('mweb.payment.transactionIdCopied'))).toBeInTheDocument();
  });

  it('quotes the ticket a timeout opened', () => {
    renderDialog({ failure: failure({ kind: 'TIMEOUT', raisesTicket: true }), ticketNo: 'ST-42' });
    expect(screen.getByTestId('payment-ticket-no')).toHaveTextContent(fallbackT('mweb.payment.ticketRaised', { vars: { ticket: 'ST-42' } }));
  });

  it('says a ticket is on its way, or that it could not be opened', () => {
    renderDialog({ failure: failure({ kind: 'TIMEOUT', raisesTicket: true }), ticketPending: true });
    expect(screen.getByText(fallbackT('mweb.payment.ticketPending'))).toBeInTheDocument();
    cleanup();
    renderDialog({ failure: failure({ kind: 'TIMEOUT', raisesTicket: true }), ticketFailed: true });
    expect(screen.getByText(fallbackT('mweb.payment.ticketFailed'))).toBeInTheDocument();
  });

  it('shows no ticket status for a decline', () => {
    renderDialog();
    expect(screen.queryByTestId('payment-ticket-status')).not.toBeInTheDocument();
  });
});

describe('PaymentFailureDialog — support and actions', () => {
  it('hides the Support section when the screen grants no claim (gift cards, products)', () => {
    renderDialog();
    expect(screen.queryByTestId('payment-support-section')).not.toBeInTheDocument();
    expect(screen.queryByText(fallbackT('mweb.payment.deductedButton'))).not.toBeInTheDocument();
  });

  it('opens the deduction claim for the pod payment from the Support section, and closes it', () => {
    renderDialog({ claim: { paymentDocId: 'doc9' } });
    expect(screen.getByText(fallbackT('mweb.payment.supportHeading'))).toBeInTheDocument();
    expect(screen.queryByTestId('claim-dialog-stub')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.payment.deductedButton') }));
    expect(h.claimProps).toMatchObject({ paymentDocId: 'doc9' });
    fireEvent.click(screen.getByTestId('claim-dialog-stub'));
    expect(screen.queryByTestId('claim-dialog-stub')).not.toBeInTheDocument();
  });

  it('retries and closes through the bottom actions', () => {
    const { onRetry, onClose } = renderDialog();
    fireEvent.click(screen.getByTestId('payment-failure-retry'));
    fireEvent.click(screen.getByTestId('payment-failure-close'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
