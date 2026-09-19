import { describe, expect, it } from 'vitest';
import {
  accountDetails,
  accountHolder,
  maskAccountNumber,
  payoutTarget,
} from '../../src/pages/finance/withdrawals-page/account-details';
import { podShareOf, withdrawerSearchText } from '../../src/pages/finance/withdrawals-page/withdrawal-cells';
import { makeBankWithdrawalRow, makeWithdrawalRow } from '../mocks/withdrawals.mock';

/**
 * The payable identifier a reviewer matches against: masked in the list, whole
 * in the Mark Paid confirmation. The server stores every account part as a
 * string that defaults to '', so a request can carry any subset of them.
 */
describe('withdrawal account details', () => {
  it('masks all but the last four digits of an account number', () => {
    expect(maskAccountNumber(' 123456789012 ')).toBe('••••9012');
    expect(maskAccountNumber('9012')).toBe('9012');
    expect(maskAccountNumber('')).toBe('');
  });

  it('shows the UPI handle for a UPI payout, or a dash when there is none', () => {
    expect(accountDetails(makeWithdrawalRow())).toBe('a@upi');
    expect(accountDetails(makeWithdrawalRow({ upi_id: '' }))).toBe('—');
    expect(payoutTarget(makeWithdrawalRow({ upi_id: '' }))).toBe('—');
    expect(accountHolder(makeWithdrawalRow({ account_holder_name: 'Ignored' }))).toBe('');
  });

  it('shows whichever of the account number and IFSC a bank payout carries', () => {
    const bank = makeBankWithdrawalRow();
    expect(accountDetails(bank)).toBe('••••9012 · HDFC0001234');
    expect(accountDetails({ ...bank, ifsc_code: '  ' })).toBe('••••9012');
    expect(accountDetails({ ...bank, account_number: '' })).toBe('HDFC0001234');
    expect(accountDetails({ ...bank, account_number: '', ifsc_code: '' })).toBe('—');
  });

  it('gives the confirmation the whole bank target, holder first', () => {
    const bank = makeBankWithdrawalRow();
    expect(payoutTarget(bank)).toBe('Blue Hall LLP · 123456789012 · HDFC0001234');
    expect(payoutTarget({ ...bank, account_holder_name: ' ' })).toBe('123456789012 · HDFC0001234');
    expect(
      payoutTarget({ ...bank, account_holder_name: '', account_number: '', ifsc_code: '' }),
    ).toBe('—');
    expect(accountHolder({ ...bank, account_holder_name: ' Blue Hall LLP ' })).toBe('Blue Hall LLP');
  });
});

describe('withdrawal cells', () => {
  it('searches a withdrawer by name and email, and falls back to a dash', () => {
    expect(withdrawerSearchText(makeWithdrawalRow())).toBe('Host A a@x');
    expect(withdrawerSearchText(makeWithdrawalRow({ beneficiary_name: '', beneficiary_email: '' }))).toBe('—');
  });

  it('names this pod’s slice only when one request drew on several pods', () => {
    expect(podShareOf(makeWithdrawalRow(), 'DUN-POD-4821')).toBeNull();
    expect(podShareOf(makeBankWithdrawalRow(), 'DUN-POD-5102')).toBe(600);
    expect(podShareOf(makeBankWithdrawalRow(), 'DUN-POD-9999')).toBeNull();
  });
});
