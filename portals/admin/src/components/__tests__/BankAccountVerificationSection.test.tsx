import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import BankAccountVerificationSection from '../BankAccountVerificationSection';
import { blankBankAccountValues, type BankAccountValues } from '../../forms/validation/bankAccount';

// Every field is `required`, so MUI appends a `*` to the visible label text —
// match by prefix rather than the exact string.
const PAYOUT_METHOD = /^Payout method/;
const ACCOUNT_HOLDER = /^Account holder name/;
const UPI_ID = /^UPI ID/;
const ACCOUNT_NUMBER = /^Account number/;
const IFSC_CODE = /^IFSC code/;

const selectOption = (label: RegExp, optionText: string) => {
  fireEvent.mouseDown(screen.getByLabelText(label));
  const listbox = screen.getByRole('listbox');
  fireEvent.click(within(listbox).getByText(optionText));
};

describe('BankAccountVerificationSection', () => {
  it('always renders the payout method options and the account holder field', () => {
    render(
      <BankAccountVerificationSection value={blankBankAccountValues()} onChange={vi.fn()} />
    );
    fireEvent.mouseDown(screen.getByLabelText(PAYOUT_METHOD));
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText('UPI')).toBeInTheDocument();
    expect(within(listbox).getByText('IMPS')).toBeInTheDocument();
    expect(within(listbox).getByText('NEFT')).toBeInTheDocument();
    expect(screen.getByLabelText(ACCOUNT_HOLDER)).toBeInTheDocument();
  });

  it('shows neither UPI nor bank-rail fields when no payout method is chosen', () => {
    render(
      <BankAccountVerificationSection value={blankBankAccountValues()} onChange={vi.fn()} />
    );
    expect(screen.queryByLabelText(UPI_ID)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(ACCOUNT_NUMBER)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(IFSC_CODE)).not.toBeInTheDocument();
  });

  it('shows only the UPI field for a UPI payout method', () => {
    render(
      <BankAccountVerificationSection
        value={{ ...blankBankAccountValues(), payout_method: 'UPI' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText(UPI_ID)).toBeInTheDocument();
    expect(screen.queryByLabelText(ACCOUNT_NUMBER)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(IFSC_CODE)).not.toBeInTheDocument();
  });

  it.each(['IMPS', 'NEFT'] as const)(
    'shows account number and IFSC, not UPI, for a %s payout method',
    (method) => {
      render(
        <BankAccountVerificationSection
          value={{ ...blankBankAccountValues(), payout_method: method }}
          onChange={vi.fn()}
        />
      );
      expect(screen.getByLabelText(ACCOUNT_NUMBER)).toBeInTheDocument();
      expect(screen.getByLabelText(IFSC_CODE)).toBeInTheDocument();
      expect(screen.queryByLabelText(UPI_ID)).not.toBeInTheDocument();
    }
  );

  it('merges a payout method change into the existing value via onChange', () => {
    const onChange = vi.fn();
    render(<BankAccountVerificationSection value={blankBankAccountValues()} onChange={onChange} />);
    selectOption(PAYOUT_METHOD, 'UPI');
    expect(onChange).toHaveBeenCalledWith({ ...blankBankAccountValues(), payout_method: 'UPI' });
  });

  it('merges an account holder name change', () => {
    const onChange = vi.fn();
    render(<BankAccountVerificationSection value={blankBankAccountValues()} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(ACCOUNT_HOLDER), {
      target: { value: 'Riya Sharma' },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...blankBankAccountValues(),
      account_holder_name: 'Riya Sharma',
    });
  });

  it('merges a UPI id change', () => {
    const onChange = vi.fn();
    const value: BankAccountValues = { ...blankBankAccountValues(), payout_method: 'UPI' };
    render(<BankAccountVerificationSection value={value} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(UPI_ID), { target: { value: 'riya@bank' } });
    expect(onChange).toHaveBeenCalledWith({ ...value, upi_id: 'riya@bank' });
  });

  it('merges an account number change', () => {
    const onChange = vi.fn();
    const value: BankAccountValues = { ...blankBankAccountValues(), payout_method: 'IMPS' };
    render(<BankAccountVerificationSection value={value} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(ACCOUNT_NUMBER), {
      target: { value: '123456' },
    });
    expect(onChange).toHaveBeenCalledWith({ ...value, account_number: '123456' });
  });

  it('uppercases the IFSC code before merging it', () => {
    const onChange = vi.fn();
    const value: BankAccountValues = { ...blankBankAccountValues(), payout_method: 'NEFT' };
    render(<BankAccountVerificationSection value={value} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(IFSC_CODE), { target: { value: 'hdfc0001234' } });
    expect(onChange).toHaveBeenCalledWith({ ...value, ifsc_code: 'HDFC0001234' });
  });

  it('shows field errors and default helper text when no error is present', () => {
    const errorFor = (field: keyof BankAccountValues) =>
      field === 'account_holder_name' ? 'Required' : undefined;
    render(
      <BankAccountVerificationSection
        value={{ ...blankBankAccountValues(), payout_method: 'UPI' }}
        onChange={vi.fn()}
        errorFor={errorFor}
      />
    );
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByText('e.g. name@bank')).toBeInTheDocument();
  });

  it('falls back to blank helper text for the main fields when errorFor is not supplied', () => {
    render(
      <BankAccountVerificationSection value={blankBankAccountValues()} onChange={vi.fn()} />
    );
    expect(screen.getByLabelText(PAYOUT_METHOD)).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(ACCOUNT_HOLDER)).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('shows account number and IFSC errors, overriding the default hint text', () => {
    const errorFor = (field: keyof BankAccountValues) => {
      if (field === 'account_number') return 'Must be 6 to 18 digits';
      if (field === 'ifsc_code') return 'Invalid IFSC';
      return undefined;
    };
    render(
      <BankAccountVerificationSection
        value={{ ...blankBankAccountValues(), payout_method: 'NEFT' }}
        onChange={vi.fn()}
        errorFor={errorFor}
      />
    );
    expect(screen.getByLabelText(ACCOUNT_NUMBER)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Must be 6 to 18 digits')).toBeInTheDocument();
    expect(screen.getByLabelText(IFSC_CODE)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Invalid IFSC')).toBeInTheDocument();
  });

  it('shows the bank-rail helper hints when no error is present', () => {
    render(
      <BankAccountVerificationSection
        value={{ ...blankBankAccountValues(), payout_method: 'IMPS' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('6 to 18 digits')).toBeInTheDocument();
    expect(screen.getByText('Format: ABCD0123456')).toBeInTheDocument();
  });
});
