/**
 * The "Download statement" form, which the partner console, mWeb and the native
 * app all render.
 *
 * A preset's days are computed, so only a CUSTOM period can be wrong — and it
 * has to be refused with the same rules the server enforces, beside the field
 * that fixes it.
 */
import { describe, expect, it } from 'vitest';

import {
  blankWalletStatementValues,
  buildWalletStatementVariables,
  makeWalletStatementSchema,
  WALLET_STATEMENT_IDLE,
  walletStatementDone,
  type WalletStatementValues,
} from '../src/schemas';

const KOLKATA = 'Asia/Kolkata';
/** Noon on 11 October 2026 in Kolkata. */
const NOW = new Date('2026-10-11T12:00:00+05:30');

const seen: { key: string; vars?: Record<string, string | number> }[] = [];
const t = (key: string, options?: { vars?: Record<string, string | number> }) => {
  seen.push({ key, vars: options?.vars });
  return key;
};

const schema = () => makeWalletStatementSchema(NOW, KOLKATA, t);

const custom = (from: string, to: string): WalletStatementValues => ({
  preset: 'CUSTOM',
  from,
  to,
  format: 'CSV',
});

const issuesFor = (values: unknown) => {
  const result = schema().safeParse(values);
  return (result.error?.issues ?? []).map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
};

describe('blankWalletStatementValues', () => {
  it('opens on this month as a PDF with no custom days', () => {
    expect(blankWalletStatementValues).toEqual({
      preset: 'THIS_MONTH',
      from: '',
      to: '',
      format: 'PDF',
    });
  });

  it('is itself a valid form', () => {
    expect(schema().safeParse(blankWalletStatementValues).success).toBe(true);
  });
});

describe('makeWalletStatementSchema — presets', () => {
  it('never validates the custom boxes while a preset is chosen', () => {
    const values = { ...blankWalletStatementValues, preset: 'LAST_FINANCIAL_YEAR', from: 'junk', to: '' };
    expect(schema().safeParse(values).success).toBe(true);
  });

  it('refuses a preset or a format that does not exist', () => {
    expect(schema().safeParse({ ...blankWalletStatementValues, preset: 'LAST_DECADE' }).success).toBe(false);
    expect(schema().safeParse({ ...blankWalletStatementValues, format: 'XLSX' }).success).toBe(false);
  });
});

describe('makeWalletStatementSchema — a custom period', () => {
  it('accepts a range inside the limits, up to and including today', () => {
    expect(schema().safeParse(custom('2026-04-01', '2026-06-30')).success).toBe(true);
    expect(schema().safeParse(custom('2026-10-11', '2026-10-11')).success).toBe(true);
  });

  it('flags the start box when the start day is missing', () => {
    expect(issuesFor(custom('', '2026-06-30'))).toEqual([
      { path: 'from', message: 'withdraw.statement.errorMissing' },
    ]);
  });

  it('flags the end box when only the end day is missing', () => {
    expect(issuesFor(custom('2026-04-01', ''))).toEqual([
      { path: 'to', message: 'withdraw.statement.errorMissing' },
    ]);
  });

  it('treats a whitespace-only day as missing', () => {
    expect(issuesFor(custom('   ', '2026-06-30'))).toEqual([
      { path: 'from', message: 'withdraw.statement.errorMissing' },
    ]);
  });

  it('refuses a day the calendar does not have', () => {
    expect(issuesFor(custom('2026-02-30', '2026-06-30'))).toEqual([
      { path: 'to', message: 'withdraw.statement.errorInvalid' },
    ]);
  });

  it('refuses a range that is back to front', () => {
    expect(issuesFor(custom('2026-06-30', '2026-04-01'))).toEqual([
      { path: 'to', message: 'withdraw.statement.errorOrder' },
    ]);
  });

  it('refuses a range reaching past today in the business zone', () => {
    expect(issuesFor(custom('2026-10-01', '2026-10-12'))).toEqual([
      { path: 'to', message: 'withdraw.statement.errorFuture' },
    ]);
  });

  it('refuses more than 366 days and tells the reader the limit', () => {
    seen.length = 0;
    expect(issuesFor(custom('2025-10-09', '2026-10-10'))).toEqual([
      { path: 'to', message: 'withdraw.statement.errorTooLong' },
    ]);
    expect(seen).toContainEqual({ key: 'withdraw.statement.errorTooLong', vars: { days: 366 } });
    expect(schema().safeParse(custom('2025-10-10', '2026-10-10')).success).toBe(true);
  });
});

describe('the download outcome', () => {
  it('starts idle', () => {
    expect(WALLET_STATEMENT_IDLE).toEqual({ kind: 'idle' });
  });

  it('is a plain success when the period had transactions', () => {
    expect(walletStatementDone({ transaction_count: 12 })).toEqual({ kind: 'done', empty: false });
  });

  it('still counts as downloaded, but flagged empty, for a nil statement', () => {
    expect(walletStatementDone({ transaction_count: 0 })).toEqual({ kind: 'done', empty: true });
  });
});

describe('buildWalletStatementVariables', () => {
  it('sends a preset as the days it covers today', () => {
    expect(
      buildWalletStatementVariables({ ...blankWalletStatementValues, preset: 'LAST_MONTH' }, NOW, KOLKATA),
    ).toEqual({ input: { from: '2026-09-01', to: '2026-09-30' }, format: 'PDF' });
  });

  it('sends a custom period exactly as picked, with the chosen format', () => {
    expect(buildWalletStatementVariables(custom('2026-04-01', '2026-06-30'), NOW, KOLKATA)).toEqual({
      input: { from: '2026-04-01', to: '2026-06-30' },
      format: 'CSV',
    });
  });

  it('reads the financial year in the business zone', () => {
    const firstMinute = new Date('2026-04-01T00:00:00+05:30');
    const values: WalletStatementValues = { ...blankWalletStatementValues, preset: 'THIS_FINANCIAL_YEAR' };
    expect(buildWalletStatementVariables(values, firstMinute, KOLKATA).input).toEqual({
      from: '2026-04-01',
      to: '2026-04-01',
    });
    expect(buildWalletStatementVariables(values, firstMinute, 'UTC').input).toEqual({
      from: '2025-04-01',
      to: '2026-03-31',
    });
  });
});
