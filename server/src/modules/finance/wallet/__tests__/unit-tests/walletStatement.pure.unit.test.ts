import {
  MAX_STATEMENT_DAYS,
  maskAccountNumber,
  maskUpiId,
  resolveStatementPeriod,
  type WalletStatement,
  type WalletStatementRow,
} from '../../walletStatement.service';
import { csvCell, walletStatementCsv } from '../../walletStatement.csv';

/**
 * The statement's pure rules: which calendar days make a valid period (read in
 * the app zone), how an account is masked, and how a row is written to CSV.
 */

const NOW = new Date('2025-06-15T10:00:00.000Z');

describe('resolveStatementPeriod', () => {
  it('turns two calendar days into Kolkata-midnight instants, the end being exclusive', () => {
    const p = resolveStatementPeriod({ from: '2025-04-01', to: '2025-04-30' }, NOW);
    expect(p.from).toBe('2025-04-01');
    expect(p.start.toISOString()).toBe('2025-03-31T18:30:00.000Z');
    expect(p.end.toISOString()).toBe('2025-04-30T18:30:00.000Z');
  });

  it('accepts today, and uses the real clock when none is given', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(resolveStatementPeriod({ from: '2025-01-01', to: '2025-01-01' }).to).toBe('2025-01-01');
    expect(() => resolveStatementPeriod({ from: '2025-01-01', to: '2999-01-01' })).toThrow('future date');
    expect(resolveStatementPeriod({ from: today, to: today }, new Date(Date.now() + 86_400_000)).from).toBe(today);
  });

  it.each([
    ['absent', null],
    ['undefined', undefined],
    ['missing to', { from: '2025-01-01', to: '' }],
    ['not a day', { from: '2025-02-30', to: '2025-03-01' }],
    ['wrong shape', { from: '1/4/25', to: '2025-04-30' }],
  ])('refuses an unreadable period (%s)', (_name, input) => {
    expect(() => resolveStatementPeriod(input as never, NOW)).toThrow('Choose a valid statement period');
  });

  it('refuses a period that ends before it starts, or ends in the future', () => {
    expect(() => resolveStatementPeriod({ from: '2025-05-02', to: '2025-05-01' }, NOW)).toThrow('on or before its end date');
    expect(() => resolveStatementPeriod({ from: '2025-06-01', to: '2025-06-17' }, NOW)).toThrow('future date');
  });

  it('allows exactly a leap year of days and no more', () => {
    expect(MAX_STATEMENT_DAYS).toBe(366);
    expect(resolveStatementPeriod({ from: '2024-01-01', to: '2024-12-31' }, NOW).from).toBe('2024-01-01');
    expect(() => resolveStatementPeriod({ from: '2024-01-01', to: '2025-01-01' }, NOW)).toThrow('at most 366 days');
  });
});

describe('masking', () => {
  it('shows only the last four characters of an account number', () => {
    expect(maskAccountNumber('123456789012')).toBe('XXXXXXXX9012');
    expect(maskAccountNumber(' 98765 ')).toBe('X8765');
    expect(maskAccountNumber('123')).toBe('123');
  });

  it('prints nothing for a missing account number or UPI id', () => {
    expect(maskAccountNumber(null)).toBe('');
    expect(maskAccountNumber(undefined)).toBe('');
    expect(maskAccountNumber('  ')).toBe('');
    expect(maskUpiId(null)).toBe('');
    expect(maskUpiId(undefined)).toBe('');
    expect(maskUpiId('')).toBe('');
  });

  it('keeps two characters of a UPI name and the handle', () => {
    expect(maskUpiId('asha@okhdfcbank')).toBe('as***@okhdfcbank');
    expect(maskUpiId('a@upi')).toBe('a***@upi');
    expect(maskUpiId('@upi')).toBe('***@upi');
    expect(maskUpiId('asha-no-handle')).toBe('as***');
  });
});

describe('CSV', () => {
  it('writes numbers bare, empties as nothing, and quotes what needs it', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(1234.5)).toBe('1234.50');
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
  });

  it('defuses text a spreadsheet would run as a formula', () => {
    for (const lead of ['=', '+', '-', '@', '\t']) {
      expect(csvCell(`${lead}SUM(A1)`).replace(/^"|"$/g, '')).toBe(`'${lead}SUM(A1)`);
    }
  });

  const row = (over: Partial<WalletStatementRow> = {}): WalletStatementRow => ({
    id: 'r1',
    occurred_at: '2025-01-02T09:00:00.000Z',
    kind: 'POD_COMPLETION',
    reference: 'rel-1',
    description: 'Earning credit',
    debit: 0,
    credit: 100,
    balance: 100,
    status: 'CREDITED',
    ...over,
  });
  const statement = (over: Partial<WalletStatement> = {}): WalletStatement => ({
    account_name: 'Asha Rao',
    account_email: 'a@x.com',
    currency_symbol: '₹',
    time_zone: 'Asia/Kolkata',
    period_from: '2025-01-01',
    period_to: '2025-01-31',
    generated_at: '2025-02-01T00:00:00.000Z',
    balances_reconciled: true,
    opening_balance: 0,
    closing_balance: 100,
    rows: [row()],
    totals: {
      transaction_count: 1,
      total_credits: 100,
      total_debits: 0,
      earnings_credited: 100,
      withdrawals_requested: 0,
      withdrawals_paid: 0,
      withdrawals_pending: 0,
      withdrawals_rejected: 0,
      reversals_credited: 0,
    },
    ...over,
  });

  it('lays out header, one record per row, and totals under the table’s columns', () => {
    const lines = walletStatementCsv(statement()).split('\r\n');
    expect(lines[0]).toBe('﻿Wallet account statement');
    expect(lines).toContain('Opening balance,0.00');
    expect(lines).toContain('Closing balance,100.00');
    const header = lines.indexOf('Date (ISO 8601),Date,Reference,Type,Description,Debit,Credit,Balance,Status');
    expect(lines[header + 1]).toMatch(/^2025-01-02T09:00:00\.000Z,.*,rel-1,POD_COMPLETION,Earning credit,0\.00,100\.00,100\.00,CREDITED$/);
    expect(lines).toContain('Totals,,,,1 transactions,0.00,100.00,100.00,');
  });

  it('states that balances are withheld and leaves each row’s balance empty when unreconciled', () => {
    const csv = walletStatementCsv(
      statement({ balances_reconciled: false, opening_balance: null, closing_balance: null, rows: [row({ balance: null })] })
    );
    expect(csv).toContain('Balances,Not shown: the ledger could not be reconciled for this period');
    expect(csv).not.toContain('Opening balance');
    expect(csv).toMatch(/0\.00,100\.00,,CREDITED/);
    expect(csv).toContain('Totals,,,,1 transactions,0.00,100.00,,');
  });
});
