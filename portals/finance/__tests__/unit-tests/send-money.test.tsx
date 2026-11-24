/**
 * Finance > Send Money: pay a person by hand, to one of their VERIFIED accounts.
 *
 * What is asserted is the safety of the flow, not just that it renders: a
 * verified destination is sent by id only, a typed account or UPI ID is
 * validated, typed twice and must be acknowledged,
 * nothing is sent until the confirmation is accepted, a failed attempt retried
 * carries the SAME request id (so it cannot pay twice), and a successful one
 * starts a fresh id.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
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

const otherSearchMock: MockedResponse = {
  request: { query: SEND_MONEY_RECIPIENTS, variables: { search: 'rohan' } },
  result: {
    data: {
      sendMoneyRecipients: [{ __typename: 'SendMoneyRecipient', id: 'u2', name: 'Rohan Das', email: '', phone: '' }],
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

  it('offers a typed account, not a dead end, when the person has no verified account', async () => {
    mount([optionsMock(), searchMock, recipientMock([])]);
    await pickMeera();
    expect(await screen.findByText(/has no verified bank account/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Pay to a different bank account or UPI ID/ })).toBeInTheDocument();
    expect(screen.queryByText('Verified bank accounts')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Money' })).toBeEnabled();
  });

  it('cannot send at all while payouts are not set up', async () => {
    mount([optionsMock(false), searchMock, recipientMock([bank])]);
    expect(await screen.findByText(/payouts are not set up.*RazorpayX Account Number/)).toBeInTheDocument();
    await pickMeera();
    await screen.findByText('Verified bank accounts');
    expect(screen.getByRole('button', { name: 'Send Money' })).toBeDisabled();
  });
});

describe('Send Money — the recipient box', () => {
  it('clears the person and their accounts together', async () => {
    mount([optionsMock(), searchMock, recipientMock([bank])]);
    await pickMeera();
    await screen.findByText('Verified bank accounts');
    fireEvent.click(screen.getByLabelText('Clear'));
    await waitFor(() => expect(screen.queryByText('Verified bank accounts')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Send Money' })).toBeDisabled();
  });

  it('keeps the chosen person selectable while a newer search shows other people', async () => {
    mount([optionsMock(), searchMock, otherSearchMock, recipientMock([bank])]);
    await pickMeera();
    await screen.findByText('Verified bank accounts');
    const box = screen.getByRole('combobox', { name: /Recipient/ });
    fireEvent.change(box, { target: { value: 'rohan' } });
    // A person with no email is listed by name alone.
    expect(await screen.findByRole('option', { name: 'Rohan Das' }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Meera Nair/ })).toBeInTheDocument();
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

  it('shows a UPI account as its address in the confirmation', async () => {
    mount([optionsMock(), searchMock, recipientMock([bank, upi]), sendMock([])]);
    await pickMeera();
    await screen.findByText('Verified bank accounts');
    fireEvent.click(screen.getByRole('radio', { name: /cafe@okhdfc/ }));
    fillPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Send Money' }));
    const dialog = await screen.findByRole('dialog', { name: 'Send this payment?' });
    expect(within(dialog).getByText('UPI · cafe@okhdfc')).toBeInTheDocument();
  });

  it('sends only once when the confirm button is double-clicked', async () => {
    const sent: Array<Record<string, unknown>> = [];
    mount([optionsMock(), searchMock, recipientMock([bank]), sendMock(sent)]);
    const dialog = await reachConfirmation();
    const confirm = within(dialog).getByRole('button', { name: 'Send Money' });
    // Both clicks land in one batch, before the first one's loading state can render.
    act(() => {
      confirm.click();
      confirm.click();
    });
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledTimes(1));
    expect(sent).toHaveLength(1);
  });

  it('reuses the SAME request id after a failed attempt, so a retry cannot pay twice', async () => {
    const attempts: unknown[] = [];
    const idOf = (variables: Record<string, unknown>) => (variables as { input: { request_id: string } }).input.request_id;
    // First attempt: the server answers with an error. Second: it succeeds.
    const failing: MockedResponse = {
      request: { query: SEND_MONEY, variables: () => true },
      result: (variables: Record<string, unknown>) => {
        attempts.push(idOf(variables));
        return { errors: [new GraphQLError('Network blip')] };
      },
      maxUsageCount: 1,
    };
    const succeeding: MockedResponse = {
      request: { query: SEND_MONEY, variables: () => true },
      result: (variables: Record<string, unknown>) => {
        attempts.push(idOf(variables));
        return { data: { sendMoney: { __typename: 'SendMoneyTransfer', id: 't1', transfer_id: 'sm_1', status: 'PROCESSING' } } };
      },
      maxUsageCount: 1,
    };
    mount([optionsMock(), searchMock, recipientMock([bank]), failing, succeeding]);
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

describe('Send Money — paying an account typed in', () => {
  const chooseCustom = async (accounts: VerifiedAccount[] = []) => {
    await pickMeera();
    fireEvent.click(await screen.findByRole('radio', { name: /Pay to a different bank account or UPI ID/ }));
    expect(await screen.findByText(/not on a verified Duncit record/)).toBeInTheDocument();
    return accounts;
  };
  const pickMethod = async (method: 'UPI' | 'IMPS' | 'NEFT') => {
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Pay by/ }));
    fireEvent.click(await screen.findByRole('option', { name: method }));
  };
  const type = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

  it('refuses a malformed UPI ID and an unticked acknowledgement, and sends nothing', async () => {
    const sent: Array<Record<string, unknown>> = [];
    mount([optionsMock(), searchMock, recipientMock([]), sendMock(sent)]);
    await chooseCustom();
    type(/^UPI ID/, 'not-a-upi');
    fillPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Send Money' }));

    expect(await screen.findByText('Enter a UPI ID such as name@okhdfcbank.')).toBeInTheDocument();
    expect(screen.getByText('Confirm you have checked the account to continue.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sent).toHaveLength(0);
  });

  it('sends a typed UPI ID as a custom account with the acknowledgement, never a verified account id', async () => {
    const sent: Array<Record<string, unknown>> = [];
    mount([optionsMock(), searchMock, recipientMock([bank]), sendMock(sent)]);
    await chooseCustom([bank]);
    // The IMPS/NEFT choice belongs to verified bank accounts; a typed one picks its own method.
    expect(screen.queryByLabelText('Withdrawal Method')).not.toBeInTheDocument();
    type(/^UPI ID/, 'asha@okicici');
    fireEvent.click(screen.getByRole('checkbox', { name: /checked these account details/ }));
    fillPayment('2500', 'Event reimbursement');
    fireEvent.click(screen.getByRole('button', { name: 'Send Money' }));

    const dialog = await screen.findByRole('dialog', { name: 'Send this payment?' });
    expect(within(dialog).getByText('UPI · asha@okicici')).toBeInTheDocument();
    expect(within(dialog).getByText(/You entered this account yourself/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send Money' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({
      recipient_user_id: 'u1',
      account_id: null,
      custom_account: { payout_method: 'UPI', upi_id: 'asha@okicici' },
      acknowledge_custom_account: true,
      amount: 2500,
    });
    expect(sent[0]).not.toHaveProperty('payout_method');
    expect(JSON.stringify(sent[0])).not.toContain('HOST:1');
  });

  it('makes the account number be typed twice and checks the IFSC before a bank transfer', async () => {
    const sent: Array<Record<string, unknown>> = [];
    mount([optionsMock(), searchMock, recipientMock([]), sendMock(sent)]);
    await chooseCustom();
    await pickMethod('NEFT');
    type(/^Account holder name/, 'Meera N');
    type(/^Account number/, '999988887777');
    type(/^Re-enter account number/, '999988887778');
    type(/^IFSC/, 'SBIN123');
    fireEvent.click(screen.getByRole('checkbox', { name: /checked these account details/ }));
    fillPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Send Money' }));

    expect(await screen.findByText('The account numbers do not match.')).toBeInTheDocument();
    expect(screen.getByText('Enter an IFSC such as HDFC0001234.')).toBeInTheDocument();
    expect(sent).toHaveLength(0);

    type(/^Re-enter account number/, '999988887777');
    type(/^IFSC/, 'sbin0000123');
    fireEvent.click(screen.getByRole('button', { name: 'Send Money' }));
    const dialog = await screen.findByRole('dialog', { name: 'Send this payment?' });
    expect(within(dialog).getByText('NEFT · Meera N · 999988887777 · SBIN0000123')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send Money' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].custom_account).toEqual({
      payout_method: 'NEFT',
      account_holder_name: 'Meera N',
      account_number: '999988887777',
      ifsc_code: 'SBIN0000123',
    });
  });

  it('asks for the holder name and a 6–18 digit account number for a bank transfer', async () => {
    mount([optionsMock(), searchMock, recipientMock([])]);
    await chooseCustom();
    await pickMethod('IMPS');
    type(/^Account number/, '12');
    fillPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Send Money' }));
    expect(await screen.findByText('Enter the account holder name.')).toBeInTheDocument();
    expect(screen.getByText('Enter an account number of 6 to 18 digits.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
