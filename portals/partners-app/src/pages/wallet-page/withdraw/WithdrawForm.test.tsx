import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { WithdrawForm } from './index';
import { renderWithProviders } from '../../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../../__tests__/groupC-link';

afterEach(cleanup);

const mount = (answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = [], minAmount = 0) => {
  const onClose = vi.fn();
  const onDone = vi.fn();
  renderWithProviders(<WithdrawForm open maxAmount={500} minAmount={minAmount} currency="₹" onClose={onClose} onDone={onDone} />, {
    link: scriptedLink({ RequestWithdrawal: { requestWithdrawal: { __typename: 'WalletWithdrawal', id: 'w1', status: 'PENDING' } }, ...answers }, sent),
  });
  return { onClose, onDone };
};

const pickMethod = async (name: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Payout method' }));
  fireEvent.click(await screen.findByRole('option', { name }));
};

describe('WithdrawForm', () => {
  it('states the ceiling in the amount label', () => {
    mount();
    expect(screen.getByLabelText(/Amount \(max ₹500\.00\)/)).toBeTruthy();
  });

  it('shows UPI first and swaps to bank fields for a bank transfer', async () => {
    mount();
    expect(screen.getByLabelText('UPI ID')).toBeTruthy();
    expect(screen.queryByLabelText('Account number')).toBeNull();
    await pickMethod('IMPS');
    expect(await screen.findByLabelText('Account number')).toBeTruthy();
    expect(screen.getByLabelText('IFSC code')).toBeTruthy();
    expect(screen.getByLabelText('Account holder name')).toBeTruthy();
    expect(screen.queryByLabelText('UPI ID')).toBeNull();
  });

  it('asks for the account number and IFSC before a bank transfer is sent', async () => {
    const sent: SentOperation[] = [];
    mount({}, sent);
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '100' } });
    await pickMethod('NEFT');
    await screen.findByLabelText('Account number');
    fireEvent.click(screen.getByRole('button', { name: 'Request withdrawal' }));

    await waitFor(() => expect(screen.getAllByText(/./, { selector: '.Mui-error, .MuiFormHelperText-root.Mui-error' }).length).toBeGreaterThan(0));
    expect(sent.some((op) => op.name === 'RequestWithdrawal')).toBe(false);
  });

  it('sends a bank transfer with the holder, account and IFSC and reports done', async () => {
    const sent: SentOperation[] = [];
    const { onDone } = mount({}, sent);
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '250' } });
    await pickMethod('IMPS');
    fireEvent.change(await screen.findByLabelText('Account holder name'), { target: { value: 'Asha Rao' } });
    fireEvent.change(screen.getByLabelText('Account number'), { target: { value: '123456789012' } });
    fireEvent.change(screen.getByLabelText('IFSC code'), { target: { value: 'HDFC0001234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request withdrawal' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(sent.find((op) => op.name === 'RequestWithdrawal')?.variables).toEqual({
      input: {
        amount: 250,
        payout_method: 'IMPS',
        account_holder_name: 'Asha Rao',
        account_number: '123456789012',
        ifsc_code: 'HDFC0001234',
      },
    });
  });

  it('refuses an amount below the role’s minimum', async () => {
    const sent: SentOperation[] = [];
    mount({}, sent, 200);
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('UPI ID'), { target: { value: 'asha@upi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request withdrawal' }));
    await waitFor(() => expect(within(screen.getByRole('dialog')).getAllByText(/200/).length).toBeGreaterThan(0));
    expect(sent.some((op) => op.name === 'RequestWithdrawal')).toBe(false);
  });

  it('closes from Cancel', () => {
    const { onClose } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
