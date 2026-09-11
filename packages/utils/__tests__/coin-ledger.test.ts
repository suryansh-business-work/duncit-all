import { describe, expect, it } from 'vitest';
import { coinLedgerLabelKey } from '../src/coin-ledger';

describe('coinLedgerLabelKey', () => {
  it('names every credit as earned, whatever paid it', () => {
    expect(coinLedgerLabelKey({ type: 'CREDIT', source: 'PAYMENT_EARN' })).toBe('mweb.coin.earned');
    expect(coinLedgerLabelKey({ type: 'CREDIT', source: 'PAYMENT_REFUND' })).toBe(
      'mweb.coin.earned',
    );
  });

  // A lapsed grant is a debit, but nobody spent it — "Redeemed" would say they did.
  it('names coins that lapsed unspent as expired', () => {
    expect(coinLedgerLabelKey({ type: 'DEBIT', source: 'COIN_EXPIRY' })).toBe('mweb.coin.expired');
  });

  it('names every other debit as redeemed', () => {
    expect(coinLedgerLabelKey({ type: 'DEBIT', source: 'PAYMENT_REDEEM' })).toBe(
      'mweb.coin.redeemed',
    );
    expect(coinLedgerLabelKey({ type: 'DEBIT', source: 'ADMIN_DEDUCT' })).toBe(
      'mweb.coin.redeemed',
    );
  });
});
