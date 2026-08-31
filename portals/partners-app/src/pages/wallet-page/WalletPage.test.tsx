import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import WalletPage from './WalletPage';
import { MY_WALLET, REQUEST_WITHDRAWAL } from './queries';

// Apollo + MUI transitions are slow on a loaded CI box.
configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);

interface WalletPayload {
  balance: number;
  currency_symbol: string;
  payout_mode: string;
  next_payout_at: string | null;
}

const wallet: WalletPayload = {
  balance: 1250.5,
  currency_symbol: '₹',
  payout_mode: 'WEEKLY',
  next_payout_at: '2026-04-01T00:00:00',
};

const transaction = (over: Record<string, unknown> = {}) => ({
  __typename: 'WalletTransaction',
  id: 't1',
  type: 'CREDIT',
  amount: 900,
  balance_after: 1250.5,
  source: 'POD_PAYOUT',
  reason: 'Pod DUN-1042 payout',
  created_at: '2026-03-20T09:00:00',
  ...over,
});

const withdrawal = (over: Record<string, unknown> = {}) => ({
  __typename: 'WalletWithdrawal',
  id: 'w1',
  withdrawal_id: 'DUN-WD-1',
  amount: 400,
  status: 'PENDING',
  payout_method: 'UPI',
  scheduled_for: null,
  reject_reason: '',
  created_at: '2026-03-21T09:00:00',
  ...over,
});

const walletMock = (
  over: Partial<WalletPayload> = {},
  transactions: ReturnType<typeof transaction>[] = [],
  withdrawals: ReturnType<typeof withdrawal>[] = [],
): MockedResponse => ({
  request: { query: MY_WALLET },
  result: {
    data: {
      myWallet: { __typename: 'Wallet', ...wallet, ...over },
      myWalletTransactions: transactions,
      myWithdrawals: withdrawals,
    },
  },
});

const renderWallet = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks}>
      <WalletPage />
    </MockedProvider>,
  );

describe('WalletPage', () => {
  it('shows a spinner and no wallet chrome until the first result lands', () => {
    renderWallet([walletMock()]);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.queryByText('Available balance')).toBeNull();
  });

  it('renders the balance to two decimals with the server currency symbol', async () => {
    renderWallet([walletMock({ currency_symbol: '$', balance: 42 })]);
    expect(await screen.findByText('$42.00')).toBeTruthy();
  });

  it('describes the payout cycle for the wallet payout mode', async () => {
    renderWallet([walletMock({ payout_mode: 'IMMEDIATE' })]);
    const caption = await screen.findByText(/Paid immediately after approval/);
    expect(caption.textContent).toContain('Next cycle');
    expect(caption.textContent).toContain('2026');
  });

  it('leaves the cycle description blank for an unknown payout mode and dashes an unparsable date', async () => {
    renderWallet([walletMock({ payout_mode: 'QUARTERLY', next_payout_at: 'not-a-date' })]);
    const caption = await screen.findByText(/Next cycle/);
    expect(caption.textContent).toBe(' · Next cycle —');
  });

  it('disables Withdraw on a zero balance', async () => {
    renderWallet([walletMock({ balance: 0 })]);
    await screen.findByText('₹0.00');
    expect(screen.getByRole('button', { name: 'Withdraw' }).hasAttribute('disabled')).toBe(true);
  });

  it('opens the withdrawal dialog capped at the available balance', async () => {
    renderWallet([walletMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw' }));
    expect(await screen.findByText('Withdraw from wallet')).toBeTruthy();
    expect(screen.getByLabelText(/Amount \(max ₹1250.50\)/)).toBeTruthy();
  });

  it('closes the withdrawal dialog on Cancel', async () => {
    renderWallet([walletMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Withdraw from wallet')).toBeNull());
  });

  it('shows both empty states when nothing has moved yet', async () => {
    renderWallet([walletMock()]);
    expect(await screen.findByText('No withdrawals yet.')).toBeTruthy();
    expect(screen.getByText('Your payouts will show up here.')).toBeTruthy();
  });

  it('lists a pending withdrawal with its amount, method and status', async () => {
    renderWallet([walletMock({}, [], [withdrawal()])]);
    expect(await screen.findByText('₹400.00 · UPI')).toBeTruthy();
    expect(screen.getByText('PENDING')).toBeTruthy();
    expect(screen.queryByText('No withdrawals yet.')).toBeNull();
  });

  it('appends the rejection reason to a rejected withdrawal', async () => {
    renderWallet([
      walletMock({}, [], [withdrawal({ status: 'REJECTED', reject_reason: 'IFSC mismatch' })]),
    ]);
    expect(await screen.findByText(/· IFSC mismatch/)).toBeTruthy();
    expect(screen.getByText('REJECTED')).toBeTruthy();
  });

  it('signs a credit with + and a debit with −', async () => {
    renderWallet([
      walletMock({}, [
        transaction(),
        transaction({ id: 't2', type: 'DEBIT', amount: 100, reason: '', source: 'WITHDRAWAL' }),
      ]),
    ]);
    expect(await screen.findByText('+₹900.00')).toBeTruthy();
    expect(screen.getByText('−₹100.00')).toBeTruthy();
  });

  it('falls back to the transaction source when it carries no reason', async () => {
    renderWallet([walletMock({}, [transaction({ reason: '', source: 'REFERRAL_BONUS' })])]);
    expect(await screen.findByText('REFERRAL_BONUS')).toBeTruthy();
  });

  it('surfaces a query failure as an error alert', async () => {
    renderWallet([
      {
        request: { query: MY_WALLET },
        result: { errors: [new GraphQLError('Wallet is temporarily unavailable')] },
      },
    ]);
    expect(await screen.findByText('Wallet is temporarily unavailable')).toBeTruthy();
  });

  it('closes the dialog and refetches the wallet once a withdrawal is requested', async () => {
    renderWallet([
      walletMock(),
      {
        request: {
          query: REQUEST_WITHDRAWAL,
          variables: {
            input: {
              amount: 400,
              payout_method: 'UPI',
              upi_id: 'asha@upi',
              account_holder_name: undefined,
              account_number: undefined,
              ifsc_code: undefined,
            },
          },
        },
        result: {
          data: {
            requestWithdrawal: {
              __typename: 'WalletWithdrawal',
              id: 'w9',
              status: 'PENDING',
            },
          },
        },
      },
      // The refetch that WalletPage fires from onDone — the new balance proves it ran.
      walletMock({ balance: 850.5 }, [], [withdrawal({ id: 'w9', amount: 400 })]),
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw' }));
    fireEvent.change(await screen.findByLabelText(/Amount/), { target: { value: '400' } });
    fireEvent.change(screen.getByLabelText('UPI ID'), { target: { value: 'asha@upi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request withdrawal' }));

    await waitFor(() => expect(screen.queryByText('Withdraw from wallet')).toBeNull());
    expect(await screen.findByText('₹850.50')).toBeTruthy();
    expect(screen.getByText('₹400.00 · UPI')).toBeTruthy();
  });

  it('keeps the dialog open when the withdrawal is under-filled', async () => {
    renderWallet([walletMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw' }));
    fireEvent.change(await screen.findByLabelText(/Amount/), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request withdrawal' }));

    expect(await screen.findByText('Max 1250.5')).toBeTruthy();
    expect(screen.getByText('Withdraw from wallet')).toBeTruthy();
  });

  it('falls back to ₹0.00 when the account has no wallet document yet', async () => {
    renderWallet([
      {
        request: { query: MY_WALLET },
        result: {
          data: { myWallet: null, myWalletTransactions: null, myWithdrawals: null },
        },
      },
    ]);
    expect(await screen.findByText('₹0.00')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Withdraw' }).hasAttribute('disabled')).toBe(true);
  });
});
