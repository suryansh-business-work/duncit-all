import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fallbackT } from '../../../i18n/fallback';
import WithdrawalPayoutRefs from '../WithdrawalPayoutRefs';
import { WithdrawalRow } from '../WalletRows';

const h = vi.hoisted(() => ({ copy: vi.fn() }));
vi.mock('@duncit/utils', async (orig) => ({ ...(await orig<object>()), copyToClipboard: h.copy }));

const paymentIdText = (id: string) => fallbackT('withdraw.history.paymentId', { vars: { id } });
const utrText = (utr: string) => fallbackT('withdraw.history.utr', { vars: { utr } });

beforeEach(() => {
  h.copy.mockReset();
});

describe('WithdrawalPayoutRefs — what it shows', () => {
  it('shows nothing before Razorpay has a payout for the withdrawal', () => {
    const { container } = render(<WithdrawalPayoutRefs paymentId="" utr="" testId="row" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the payment id alone while the bank has not confirmed the payment', () => {
    render(<WithdrawalPayoutRefs paymentId="pout_Q1" utr="" testId="row" />);
    expect(screen.getByTestId('row-payment-id')).toHaveTextContent(paymentIdText('pout_Q1'));
    expect(screen.queryByTestId('row-utr')).not.toBeInTheDocument();
  });

  it('shows the bank reference alone when that is all the payout carries', () => {
    render(<WithdrawalPayoutRefs paymentId={null} utr="UTR77" testId="row" />);
    expect(screen.getByTestId('row-utr')).toHaveTextContent(utrText('UTR77'));
    expect(screen.queryByTestId('row-payment-id')).not.toBeInTheDocument();
  });
});

describe('WithdrawalPayoutRefs — copying', () => {
  it('copies the reference pressed and confirms it on that line only', async () => {
    h.copy.mockResolvedValue(true);
    render(<WithdrawalPayoutRefs paymentId="pout_Q1" utr="UTR77" testId="row" />);

    await act(async () => fireEvent.click(screen.getByRole('button', { name: fallbackT('withdraw.history.copyUtr') })));
    expect(h.copy).toHaveBeenCalledWith('UTR77');
    expect(screen.getByTestId('row-utr-status')).toHaveTextContent(fallbackT('withdraw.history.copied'));
    expect(screen.getByTestId('row-payment-id-status')).toBeEmptyDOMElement();

    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: fallbackT('withdraw.history.copyPaymentId') })),
    );
    expect(h.copy).toHaveBeenLastCalledWith('pout_Q1');
    expect(screen.getByTestId('row-payment-id-status')).toHaveTextContent(fallbackT('withdraw.history.copied'));
  });

  it('says the copy did not land when the clipboard is unavailable', async () => {
    h.copy.mockResolvedValue(false);
    render(<WithdrawalPayoutRefs paymentId="pout_Q1" utr="" testId="row" />);
    await act(async () => fireEvent.click(screen.getByTestId('row-payment-id-copy')));
    expect(screen.getByTestId('row-payment-id-status')).toHaveTextContent(fallbackT('withdraw.history.copyFailed'));
  });
});

describe('WithdrawalRow — payout references', () => {
  const base = {
    id: 'w1',
    amount: 500,
    payout_method: 'IMPS',
    reject_reason: '',
    created_at: '2026-06-13T00:00:00.000Z',
  };

  it('carries a paid withdrawal’s payment id and bank reference, and none on a pending one', () => {
    const { rerender } = render(
      <WithdrawalRow w={{ ...base, status: 'PAID', razorpay_payout_id: 'pout_Q1', payout_utr: 'UTR77' }} currency="₹" />,
    );
    expect(screen.getByTestId('wallet-withdrawal-w1-payment-id')).toHaveTextContent(paymentIdText('pout_Q1'));
    expect(screen.getByTestId('wallet-withdrawal-w1-utr')).toHaveTextContent(utrText('UTR77'));

    rerender(<WithdrawalRow w={{ ...base, status: 'PENDING', razorpay_payout_id: '', payout_utr: '' }} currency="₹" />);
    expect(screen.getByTestId('wallet-withdrawal-w1')).toBeInTheDocument();
    expect(screen.queryByTestId('wallet-withdrawal-w1-payment-id')).not.toBeInTheDocument();
    expect(screen.queryByTestId('wallet-withdrawal-w1-utr')).not.toBeInTheDocument();
  });
});
