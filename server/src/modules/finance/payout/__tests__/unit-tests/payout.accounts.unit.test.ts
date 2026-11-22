import { matchVerified, toVerifiedAccount, type VerifiedAccount } from '../../payout.accounts';

const account = (patch: Partial<VerifiedAccount> = {}): VerifiedAccount => ({
  id: 'HOST:1',
  source: 'HOST',
  label: 'Meera',
  payout_method: 'IMPS',
  account_holder_name: 'Meera Nair',
  account_number: '123456789012',
  ifsc_code: 'HDFC0001234',
  upi_id: '',
  ...patch,
});

describe('toVerifiedAccount', () => {
  it('builds an account whose id names its source record', () => {
    const built = toVerifiedAccount('VENUE', 'abc123', 'Cafe Nine', {
      payout_method: 'neft',
      account_holder_name: ' Cafe Nine LLP ',
      account_number: '9988776655',
      ifsc_code: 'sbin0000123',
    });
    expect(built).toMatchObject({
      id: 'VENUE:abc123',
      source: 'VENUE',
      label: 'Cafe Nine',
      payout_method: 'NEFT',
      account_holder_name: 'Cafe Nine LLP',
      ifsc_code: 'SBIN0000123',
    });
  });

  it('drops a record with no payout method, or a method with no destination', () => {
    expect(toVerifiedAccount('HOST', '1', 'x', {})).toBeNull();
    expect(toVerifiedAccount('HOST', '1', 'x', { payout_method: 'IMPS', account_number: '123' })).toBeNull();
    expect(toVerifiedAccount('HOST', '1', 'x', { payout_method: 'UPI' })).toBeNull();
    expect(toVerifiedAccount('HOST', '1', 'x', null)).toBeNull();
  });

  it('keeps a UPI-only account', () => {
    expect(toVerifiedAccount('HOST', '1', 'x', { payout_method: 'UPI', upi_id: 'm@okhdfc' })).toMatchObject({
      payout_method: 'UPI',
      upi_id: 'm@okhdfc',
    });
  });
});

describe('matchVerified', () => {
  const accounts = [account(), account({ id: 'HOST:2', payout_method: 'UPI', account_number: '', ifsc_code: '', upi_id: 'meera@okhdfc' })];

  it('matches a bank destination on account number and IFSC', () => {
    expect(matchVerified(accounts, { payout_method: 'IMPS', account_number: '123456789012', ifsc_code: 'hdfc0001234' })?.id).toBe('HOST:1');
  });

  it('still matches when the person asks for NEFT instead of the verified IMPS — same account', () => {
    expect(matchVerified(accounts, { payout_method: 'NEFT', account_number: '123456789012', ifsc_code: 'HDFC0001234' })?.id).toBe('HOST:1');
  });

  it('matches a UPI destination case-insensitively', () => {
    expect(matchVerified(accounts, { payout_method: 'UPI', upi_id: 'MEERA@okhdfc' })?.id).toBe('HOST:2');
  });

  it('does not match a different account number, a different IFSC, or a different UPI id', () => {
    expect(matchVerified(accounts, { payout_method: 'IMPS', account_number: '123456789013', ifsc_code: 'HDFC0001234' })).toBeNull();
    expect(matchVerified(accounts, { payout_method: 'IMPS', account_number: '123456789012', ifsc_code: 'HDFC0009999' })).toBeNull();
    expect(matchVerified(accounts, { payout_method: 'UPI', upi_id: 'someone@okhdfc' })).toBeNull();
  });

  it('never matches a UPI request against a bank account or the reverse', () => {
    expect(matchVerified([account()], { payout_method: 'UPI', upi_id: '123456789012@HDFC0001234' })).toBeNull();
    expect(matchVerified([account({ payout_method: 'UPI', account_number: '', ifsc_code: '', upi_id: 'm@okhdfc' })], {
      payout_method: 'IMPS',
      account_number: '',
      ifsc_code: '',
    })).toBeNull();
  });

  it('matches nothing when the person has no verified account', () => {
    expect(matchVerified([], { payout_method: 'IMPS', account_number: '1', ifsc_code: 'HDFC0001234' })).toBeNull();
  });
});
