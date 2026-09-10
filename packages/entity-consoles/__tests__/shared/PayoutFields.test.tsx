import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { BANK_PAYOUT_METHODS } from '@duncit/forms';
import PayoutFields from '../../src/shared/PayoutFields';

/**
 * Where a partner's money goes.
 *
 * A venue and a host store the SAME `BankAccountVerification` subdocument, so the
 * point of this block is that both write it through one component and the method
 * dropdown offers exactly what the server accepts — a fourth value would be
 * normalized back to '' and read as "my edit did not save".
 */
interface Values {
  bank_account: {
    payout_method: string;
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    upi_id: string;
  };
}

let methods: UseFormReturn<Values> | null = null;

function renderPayout(prefix = 'bank_account') {
  function Harness() {
    methods = useForm<Values>({
      defaultValues: {
        bank_account: {
          payout_method: 'IMPS',
          account_holder_name: 'Third Wave Coffee LLP',
          account_number: '000123456789',
          ifsc_code: 'HDFC0001234',
          upi_id: '',
        },
      },
    });
    return <PayoutFields control={methods.control} prefix={prefix} />;
  }
  return render(<Harness />);
}

describe('PayoutFields', () => {
  it('renders all five stored fields', () => {
    renderPayout();
    expect(screen.getByLabelText(/Account holder/)).toHaveValue('Third Wave Coffee LLP');
    expect(screen.getByLabelText(/Account number/)).toHaveValue('000123456789');
    expect(screen.getByLabelText(/IFSC code/)).toHaveValue('HDFC0001234');
    expect(screen.getByLabelText(/UPI ID/)).toHaveValue('');
  });

  it('offers exactly the methods the server accepts, plus "not set up"', () => {
    renderPayout();
    expect(screen.getByText('IMPS')).toBeInTheDocument();
    // Nothing invented: the options come from BANK_PAYOUT_METHODS.
    expect([...BANK_PAYOUT_METHODS]).toEqual(['UPI', 'IMPS', 'NEFT']);
  });

  it('lets a payout be un-set back to blank', async () => {
    // A partner who removes their bank details must be able to; the server
    // stores '' for "no payout set up".
    const user = userEvent.setup();
    renderPayout();
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: /Not set up/ }));
    expect(methods?.getValues('bank_account.payout_method')).toBe('');
  });

  it('writes back under the prefix it was given', async () => {
    const user = userEvent.setup();
    renderPayout();
    await user.clear(screen.getByLabelText(/UPI ID/));
    await user.type(screen.getByLabelText(/UPI ID/), 'rohit@okhdfc');
    expect(methods?.getValues('bank_account.upi_id')).toBe('rohit@okhdfc');
  });
});
