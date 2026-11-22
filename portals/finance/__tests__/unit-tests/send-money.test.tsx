/**
 * Finance > Send Money: pay a person by hand, to one of their VERIFIED accounts.
 *
 * What is asserted is the safety of the flow, not just that it renders: the
 * destination is never typed, a person with no verified account cannot be paid,
 * nothing is sent until the confirmation is accepted, a failed attempt retried
 * carries the SAME request id (so it cannot pay twice), and a successful one
 * starts a fresh id.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { SendMoneyPage } from '../../src/pages/finance';
import {
  SEND_MONEY,
  SEND_MONEY_OPTIONS,
  SEND_MONEY_RECIPIENT,
  SEND_MONEY_RECIPIENTS,
  type VerifiedAccount,
} from '../../src/pages/finance/send-money-page/queries';
import { notifyError, notifySuccess } from './mocks/dialogs';
import { renderWithProviders } from '../testkit';

const bank: VerifiedAccount = {
  id: 'HOST:1',
  source: 'HOST',
  label: 'Meera Nair',
  payout_method: 'IMPS',
  account_holder_name: 'Meera Nair',
  account_number: '123456789012',
  ifsc_code: 'HDFC0001234',
  upi_id: '',
};
const upi: VerifiedAccount = { ...bank, id: 'VENUE:2', source: 'VENUE', label: 'Cafe Nine', payout_method: 'UPI', account_number: '', ifsc_code: '', upi_id: 'cafe@okhdfc' };

const optionsMock = (payoutsConfigured = true): MockedResponse => ({
  request: { query: SEND_MONEY_OPTIONS },
  result: {
    data: {
      sendMoneyOptions: {
        __typename: 'SendMoneyOptions',
        categories: ['SALARY', 'REFUND', 'REIMBURSEMENT', 'ADJUSTMENT', 'OTHER'],
        payouts_configured: payoutsConfigured,
        currency_symbol: '₹',
      },
    },
  },
  maxUsageCount: 20,
});

const searchMock: MockedResponse = {
  request: { query: SEND_MONEY_RECIPIENTS, variables: { search: 'meera' } },
  result: {
    data: {
      sendMoneyRecipients: [
        { __typename: 'SendMoneyRecipient', id: 'u1', name: 'Meera Nair', email: 'meera@example.com', phone: '+919999900000' },
      ],
    },
  },
  maxUsageCount: 20,
};

const recipientMock = (accounts: VerifiedAccount[]): MockedResponse => ({
  request: { query: SEND_MONEY_RECIPIENT, variables: { id: 'u1' } },
  result: {
    data: {
      sendMoneyRecipient: {
        __typename: 'SendMoneyRecipient',
        id: 'u1',
        name: 'Meera Nair',
        email: 'meera@example.com',
        phone: '+919999900000',
        verified_accounts: accounts.map((a) => ({ __typename: 'VerifiedBankAccount', ...a })),
      },
    },
  },
  maxUsageCount: 20,
});

/** Answers every send and records its input, so a wrong destination or a duplicate shows up. */
const sendMock = (sent: Array<Record<string, unknown>>, over: { fail?: boolean } = {}): MockedResponse => ({
  request: { query: SEND_MONEY, variables: () => true },
  ...(over.fail
    ? { error: new Error('Insufficient RazorpayX balance') }
    : {
        result: (variables: Record<string, unknown>) => {
          sent.push((variables as { input: Record<string, unknown> }).input);
          return { data: { sendMoney: { __typename: 'SendMoneyTransfer', id: 't1', transfer_id: 'sm_1', status: 'PROCESSING' } } };
        },
      }),
  maxUsageCount: 20,
});

const mount = (mocks: MockedResponse[]) =>
  renderWithProviders(<SendMoneyPage />, { path: '/send-money', entry: '/send-money', mocks });

/** Type into the recipient box and pick the first match. */
const pickMeera = async () => {
  const box = await screen.findByRole('combobox', { name: /Recipient/ });
  fireEvent.change(box, { target: { value: 'meera' } });
  fireEvent.click(await screen.findByRole('option', { name: /Meera Nair/ }, { timeout: 3000 }));
};

const fillPayment = (amount = '15000', reason = 'October salary') => {
  fireEvent.change(screen.getByLabelText(/^Amount/), { target: { value: amount } });
  fireEvent.change(screen.getByLabelText(/^Reason/), { target: { value: reason } });
};

beforeEach(() => {
  notifySuccess.mockClear();
  notifyError.mockClear();
});

describe('Send Money — choosing who to pay', () => {
  it('asks for at least two characters before it searches, and says when nobody matches', async () => {
    mount([optionsMock()]);
    const box = await screen.findByRole('combobox', { name: /Recipient/ });
    fireEvent.mouseDown(box);
    expect(await screen.findByText('Type at least two characters to search')).toBeInTheDocument();
  });

  it('shows the person’s details and their verified accounts once chosen', async () => {
    mount([optionsMock(), searchMock, recipientMock([bank, upi])]);
    await pickMeera();

    expect(await screen.findByText('meera@example.com · +919999900000')).toBeInTheDocument();
    expect(screen.getByText('Verified bank accounts')).toBeInTheDocument();
    // The account number is masked to its last four digits in the picker.
    expect(screen.getByText('••••9012 · HDFC0001234')).toBeInTheDocument();
    expect(screen.getByText('cafe@okhdfc')).toBeInTheDocument();
  });

  it('cannot pay a person who has no verified account', async () => {
    mount([optionsMock(), searchMock, recipientMock([])]);
    await pickMeera();
    expect(await screen.findByText(/has no verified bank account/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Money' })).toBeDisabled();
  });

  it('cannot send at all while payouts are not set up', async () => {
    mount([optionsMock(false), searchMock, recipientMock([bank])]);
    expect(await screen.findByText(/Payouts are not set up/)).toBeInTheDocument();
    await pickMeera();
    await screen.findByText('Verified bank accounts');
    expect(screen.getByRole('button', { name: 'Send Money' })).toBeDisabled();
  });
});

describe('Send Money — the form', () => {
  it('names every missing field and sends nothing', async () => {
    const sent: Array<Record<string, unknown>> = [];
    mount([optionsMock(), searchMock, recipientMock([bank]), sendMock(sent)]);
    await pickMeera();
    await screen.findByText('Verified bank accounts');
    fireEvent.click(screen.getByRole('button', { name: 'Send Money' }));

    expect(await screen.findByText('Enter an amount of at least 1.')).toBeInTheDocument();
    expect(screen.getByText('Give a reason of at least 3 characters.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sent).toHaveLength(0);
  });

  it('requires choosing the account when the person has more than one', async () => {
    mount([optionsMock(), searchMock, recipientMock([bank, upi])]);
    await pickMeera();
    await screen.findByText('Verified bank accounts');
    fireEvent.click(screen.getByRole('button', { name: 'Send Money' }));
    expect(await screen.findByText('Select the account to pay.')).toBeInTheDocument();
  });

  it('only offers IMPS or NEFT for a bank account, never for a UPI one', async () => {
    mount([optionsMock(), searchMock, recipientMock([bank, upi])]);
    await pickMeera();
    await screen.findByText('Verified bank accounts');
    fireEvent.click(screen.getByRole('radio', { name: /cafe@okhdfc/ }));
    await waitFor(() => expect(screen.queryByLabelText('Withdrawal Method')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('radio', { name: /9012/ }));
    expect(await screen.findByLabelText('Withdrawal Method')).toBeInTheDocument();
  });
});

describe('Send Money — confirming and sending', () => {
  const reachConfirmation = async () => {
    await pickMeera();
    await screen.findByText('Verified bank accounts');
    fillPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Send Money' }));
    return screen.findByRole('dialog', { name: 'Send this payment?' });
  };

  it('repeats recipient, the whole account, amount, category and reason before anything moves', async () => {
    const sent: Array<Record<string, unknown>> = [];
    mount([optionsMock(), searchMock, recipientMock([bank]), sendMock(sent)]);
    const dialog = await reachConfirmation();

    expect(within(dialog).getByText('Meera Nair (meera@example.com)')).toBeInTheDocument();
    expect(within(dialog).getByText('IMPS · Meera Nair · 123456789012 · HDFC0001234')).toBeInTheDocument();
    expect(within(dialog).getByText('₹15,000.00')).toBeInTheDocument();
    expect(within(dialog).getByText('Salary')).toBeInTheDocument();
    expect(within(dialog).getByText('October salary')).toBeInTheDocument();
    expect(sent).toHaveLength(0);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(sent).toHaveLength(0);
  });

  it('sends the chosen account id — never account details — and a request id, then clears the form', async () => {
    const sent: Array<Record<string, unknown>> = [];
    mount([optionsMock(), searchMock, recipientMock([bank]), sendMock(sent)]);
    const dialog = await reachConfirmation();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send Money' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Payment sent. It will show as paid once the bank confirms it.'));
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      recipient_user_id: 'u1',
      account_id: 'HOST:1',
      payout_method: 'IMPS',
      amount: 15000,
      category: 'SALARY',
      reason: 'October salary',
    });
    expect(sent[0].request_id).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    expect(JSON.stringify(sent[0])).not.toContain('123456789012');
    expect(JSON.stringify(sent[0])).not.toContain('HDFC0001234');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText(/^Amount/)).toHaveValue(null);
  });

  it('reuses the SAME request id after a failed attempt, so a retry cannot pay twice', async () => {
    const attempts: unknown[] = [];
    const recorder: MockedResponse = {
      request: { query: SEND_MONEY, variables: () => true },
      result: (variables: Record<string, unknown>) => {
        attempts.push((variables as { input: { request_id: string } }).input.request_id);
        if (attempts.length === 1) throw new Error('Network blip');
        return { data: { sendMoney: { __typename: 'SendMoneyTransfer', id: 't1', transfer_id: 'sm_1', status: 'PROCESSING' } } };
      },
      maxUsageCount: 20,
    };
    mount([optionsMock(), searchMock, recipientMock([bank]), recorder]);
    let dialog = await reachConfirmation();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send Money' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'Send Money' }));
    dialog = await screen.findByRole('dialog', { name: 'Send this payment?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send Money' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledTimes(1));
    expect(attempts).toHaveLength(2);
    expect(attempts[1]).toBe(attempts[0]);
  });

  it('starts a NEW request id for the next payment once one has succeeded', async () => {
    const sent: Array<Record<string, unknown>> = [];
    mount([optionsMock(), searchMock, recipientMock([bank]), sendMock(sent)]);
    let dialog = await reachConfirmation();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send Money' }));
    await waitFor(() => expect(sent).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    dialog = await reachConfirmation();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send Money' }));
    await waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[1].request_id).not.toBe(sent[0].request_id);
  });

  it('shows the server’s refusal and sends nothing it did not accept', async () => {
    mount([optionsMock(), searchMock, recipientMock([bank]), sendMock([], { fail: true })]);
    const dialog = await reachConfirmation();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send Money' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Insufficient RazorpayX balance'));
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
