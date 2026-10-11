import { appDateTime } from '@utils/app-time';
import type { WalletStatement, WalletStatementRow } from './walletStatement.service';

/**
 * The wallet statement as a spreadsheet file, drawn from the same rows the PDF
 * prints.
 *
 *  - RFC 4180: CRLF records, a field holding a comma, a quote or a line break
 *    is quoted, and a quote inside it is doubled.
 *  - A UTF-8 byte-order mark first, or Excel reads the file as ANSI and turns
 *    the rupee sign and every non-Latin pod title into mojibake.
 *  - Money is written as a bare number (`1234.50`, no symbol, no grouping) so a
 *    spreadsheet can sum the column; the currency is stated once in the header.
 *  - Every date appears twice: the exact ISO 8601 instant for machines, and the
 *    same instant in the app time zone and the admin's patterns for people.
 *  - TEXT cells that start with = + - @ (or a tab / carriage return) get a
 *    leading apostrophe. A pod title or a reject reason is free text somebody
 *    else typed; without this a spreadsheet would execute it as a formula.
 */

const BOM = '﻿';
const EOL = '\r\n';
const FORMULA_LEADS = new Set(['=', '+', '-', '@', '\t', '\r']);
const NEEDS_QUOTES = /[",\r\n]/;

type Cell = string | number | null;

const money = (value: number) => value.toFixed(2);

/** One CSV field: numbers as they are, text neutralised and quoted when it has to be. */
export function csvCell(value: Cell): string {
  if (value === null) return '';
  if (typeof value === 'number') return money(value);
  const safe = FORMULA_LEADS.has(value.charAt(0)) ? `'${value}` : value;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

const record = (cells: Cell[]) => cells.map(csvCell).join(',');

const COLUMNS = [
  'Date (ISO 8601)',
  'Date',
  'Reference',
  'Type',
  'Description',
  'Debit',
  'Credit',
  'Balance',
  'Status',
];

const rowRecord = (row: WalletStatementRow) =>
  record([
    row.occurred_at,
    appDateTime(row.occurred_at),
    row.reference,
    row.kind,
    row.description,
    row.debit,
    row.credit,
    row.balance,
    row.status,
  ]);

function headerRecords(s: WalletStatement): string[] {
  const lines = [
    record(['Wallet account statement']),
    record(['Account name', s.account_name]),
    record(['Account email', s.account_email]),
    record(['Period from', s.period_from]),
    record(['Period to', s.period_to]),
    record(['Time zone', s.time_zone]),
    record(['Generated at (ISO 8601)', s.generated_at]),
    record(['Generated at', appDateTime(s.generated_at)]),
    record(['Currency', s.currency_symbol]),
  ];
  if (s.balances_reconciled) {
    lines.push(record(['Opening balance', s.opening_balance]), record(['Closing balance', s.closing_balance]));
  } else {
    lines.push(record(['Balances', 'Not shown: the ledger could not be reconciled for this period']));
  }
  return lines;
}

function footerRecords(s: WalletStatement): string[] {
  const t = s.totals;
  return [
    // Sits under the table's own columns, so the debit and credit totals line up.
    record(['Totals', '', '', '', `${t.transaction_count} transactions`, t.total_debits, t.total_credits, s.closing_balance, '']),
    '',
    record(['Total credits', t.total_credits]),
    record(['Total debits', t.total_debits]),
    record(['Earnings credited', t.earnings_credited]),
    record(['Withdrawals requested', t.withdrawals_requested]),
    record(['Withdrawals paid', t.withdrawals_paid]),
    record(['Withdrawals pending', t.withdrawals_pending]),
    record(['Withdrawals rejected', t.withdrawals_rejected]),
    record(['Rejected withdrawals returned', t.reversals_credited]),
  ];
}

/** The whole file as one string, BOM included. */
export function walletStatementCsv(statement: WalletStatement): string {
  const lines = [
    ...headerRecords(statement),
    '',
    record(COLUMNS),
    ...statement.rows.map(rowRecord),
    '',
    ...footerRecords(statement),
  ];
  return `${BOM}${lines.join(EOL)}${EOL}`;
}
