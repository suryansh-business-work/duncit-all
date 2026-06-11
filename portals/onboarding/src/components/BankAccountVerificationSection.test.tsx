import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BankAccountVerificationSection from './BankAccountVerificationSection';
import { blankBankAccountValues, type BankAccountValues } from '../forms/validation/bankAccount';

const upi: BankAccountValues = { ...blankBankAccountValues(), payout_method: 'UPI', upi_id: 'a@okhdfc', account_holder_name: 'Asha' };
const neft: BankAccountValues = {
  ...blankBankAccountValues(),
  payout_method: 'NEFT',
  account_holder_name: 'Asha',
  account_number: '123456',
  ifsc_code: 'HDFC0123456',
};

describe('BankAccountVerificationSection', () => {
  it('shows the UPI field for UPI payouts and edits values', () => {
    const onChange = vi.fn();
    render(<BankAccountVerificationSection value={upi} onChange={onChange} errorFor={() => undefined} />);
    fireEvent.change(screen.getByLabelText(/UPI ID/), { target: { value: 'b@okaxis' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ upi_id: 'b@okaxis' }));
    fireEvent.change(screen.getByLabelText(/Account holder name/), { target: { value: 'Bo' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ account_holder_name: 'Bo' }));
  });

  it('shows bank rails for NEFT, uppercases IFSC and surfaces errors', () => {
    const onChange = vi.fn();
    const errorFor = (field: keyof BankAccountValues) => (field === 'ifsc_code' ? 'Bad IFSC' : undefined);
    render(<BankAccountVerificationSection value={neft} onChange={onChange} errorFor={errorFor} />);
    expect(screen.getByText('Bad IFSC')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Account number/), { target: { value: '999' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ account_number: '999' }));
    fireEvent.change(screen.getByLabelText(/IFSC code/), { target: { value: 'sbin0001' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ifsc_code: 'SBIN0001' }));
  });

  it('renders bank rails with no errors when errorFor is omitted', () => {
    render(<BankAccountVerificationSection value={neft} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/IFSC code/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Account number/)).toBeInTheDocument();
  });

  it('renders without optional errorFor and hides method-specific fields when blank', () => {
    const onChange = vi.fn();
    render(<BankAccountVerificationSection value={blankBankAccountValues()} onChange={onChange} />);
    expect(screen.queryByLabelText(/UPI ID/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Account number/)).not.toBeInTheDocument();
    // Choosing a payout method fires the select onChange handler.
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'IMPS' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ payout_method: 'IMPS' }));
  });
});
