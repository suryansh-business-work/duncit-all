import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { format, isValid, parse } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { UserModel } from '@modules/access/user/user.model';
import { getFinanceSettings, type IFinanceSettings } from '@modules/finance/finance/finance.model';
import type { PaymentReleaseKind } from '@modules/finance/finance/paymentRelease.model';
import { logs } from '@observability/log';
import { appDateTime, appFormat, getAppTimeZone } from '@utils/app-time';
import {
  WalletModel,
  WalletTransactionModel,
  WalletWithdrawalModel,
  type WalletTxnSource,
  type WalletTxnType,
  type WithdrawalMethod,
  type WithdrawalStatus,
} from './wallet.model';

/**
 * The partner's wallet account statement — READ-ONLY reporting over the wallet
 * ledger. Nothing here writes, upserts or recomputes money.
 *
 * WHAT MOVES THE BALANCE (wallet.service.ts is the only writer):
 *  - CREDIT / POD_COMPLETION      an approved payout release, already net of
 *                                 every fee and commission, lands in the wallet
 *  - DEBIT  / WITHDRAWAL          the amount leaves the wallet the moment a
 *                                 withdrawal is REQUESTED (not when it is paid)
 *  - CREDIT / WITHDRAWAL_REVERSAL a REJECTED withdrawal hands its amount back
 *
 * A withdrawal being marked PAID is a status change on the withdrawal record and
 * moves no money, so it is not a row: it is the `status` of that withdrawal's
 * debit row. One ledger row is therefore exactly one statement row.
 *
 * RECONCILIATION. The opening balance is the `balance_after` the ledger stored
 * on the last entry before the period; the closing balance is opening + credits
 * - debits, summed in whole paise. That closing figure is then checked against
 * the `balance_after` stored on the period's last entry. When the two disagree
 * the statement says so (`balances_reconciled: false`) and carries NO balances
 * at all — a running balance that does not add up is worse than none.
 */

/** A financial year can hold 366 days; nothing longer is ever one statement. */
export const MAX_STATEMENT_DAYS = 366;
/** Ceiling on rows held and drawn for one statement; a longer one is refused, never truncated. */
export const MAX_STATEMENT_ROWS = 5000;

const DAY_MS = 86_400_000;
const DAY_PATTERN = 'yyyy-MM-dd';

export type WalletStatementRowStatus = 'CREDITED' | 'REVERSED' | WithdrawalStatus;

export interface WalletStatementRow {
  id: string;
  occurred_at: string;
  kind: WalletTxnSource;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  /** Null when the statement could not be reconciled. */
  balance: number | null;
  status: WalletStatementRowStatus;
}

export interface WalletStatementTotals {
  transaction_count: number;
  total_credits: number;
  total_debits: number;
  earnings_credited: number;
  withdrawals_requested: number;
  withdrawals_paid: number;
  withdrawals_pending: number;
  withdrawals_rejected: number;
  reversals_credited: number;
}

export interface WalletStatement {
  account_name: string;
  account_email: string;
  currency_symbol: string;
  time_zone: string;
  period_from: string;
  period_to: string;
  generated_at: string;
  balances_reconciled: boolean;
  opening_balance: number | null;
  closing_balance: number | null;
  rows: WalletStatementRow[];
  totals: WalletStatementTotals;
}

export interface WalletStatementInput {
  from: string;
  to: string;
}

export interface StatementPeriod {
  from: string;
  to: string;
  /** First instant of `from` in the app time zone. */
  start: Date;
  /** First instant AFTER `to` in the app time zone (exclusive bound). */
  end: Date;
}

interface LedgerDoc {
  _id: Types.ObjectId;
  type: WalletTxnType;
  amount: number;
  balance_after: number;
  source: WalletTxnSource;
  reason?: string;
  release_id?: string | null;
  withdrawal_id?: string | null;
  created_at: Date;
}

interface WithdrawalFacts {
  withdrawal_id: string;
  status: WithdrawalStatus;
  payout_method: WithdrawalMethod;
  account_number?: string;
  upi_id?: string;
  paid_at?: Date | null;
}

interface ReleaseFacts {
  release_id: string;
  kind: PaymentReleaseKind;
  pod_title?: string;
}

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

const toPaise = (value: number) => Math.round((Number(value) || 0) * 100);
const fromPaise = (paise: number) => paise / 100;

/** A real yyyy-MM-dd calendar day, or null — "2026-02-30" and "1/4/26" are not. */
function realDay(value: unknown): string | null {
  const key = String(value ?? '').trim();
  const parsed = parse(key, DAY_PATTERN, new Date(0));
  return isValid(parsed) && format(parsed, DAY_PATTERN) === key ? key : null;
}

const dayMs = (key: string) => new Date(`${key}T00:00:00Z`).getTime();
const nextDay = (key: string) => new Date(dayMs(key) + DAY_MS).toISOString().slice(0, 10);

/**
 * Validate a requested period and turn its two calendar days into instants.
 *
 * The days are read in the APP time zone (Admin > Settings), never the server
 * process zone and never the caller's device: 1 April starts at Kolkata
 * midnight, which is 31 March 18:30 UTC.
 */
export function resolveStatementPeriod(input: WalletStatementInput | null | undefined, now = new Date()): StatementPeriod {
  const from = realDay(input?.from);
  const to = realDay(input?.to);
  if (!from || !to) throw badInput('Choose a valid statement period');
  if (from > to) throw badInput('The statement start date must be on or before its end date');
  if (to > appFormat(now, DAY_PATTERN)) throw badInput('A statement cannot cover a future date');
  const days = Math.round((dayMs(to) - dayMs(from)) / DAY_MS) + 1;
  if (days > MAX_STATEMENT_DAYS) throw badInput(`A statement can cover at most ${MAX_STATEMENT_DAYS} days`);
  const zone = getAppTimeZone();
  return {
    from,
    to,
    start: fromZonedTime(`${from}T00:00:00`, zone),
    end: fromZonedTime(`${nextDay(to)}T00:00:00`, zone),
  };
}

/**
 * The period's ledger rows, oldest first: only the eight fields a row needs,
 * as plain objects, and never more than the ceiling plus one. That extra row is
 * requested on purpose — it is how "too many" is told apart from "exactly
 * full" — so the period cap and this limit together bound what one request can
 * hold in memory, whatever the size of the account.
 */
async function loadLedger(userId: Types.ObjectId, period: StatementPeriod): Promise<LedgerDoc[]> {
  const docs = await WalletTransactionModel.find({
    user_id: userId,
    created_at: { $gte: period.start, $lt: period.end },
  })
    .sort({ created_at: 1, _id: 1 })
    .limit(MAX_STATEMENT_ROWS + 1)
    .select('type amount balance_after source reason release_id withdrawal_id created_at')
    .lean<LedgerDoc[]>();
  if (docs.length > MAX_STATEMENT_ROWS) {
    throw badInput(
      `This period has more than ${MAX_STATEMENT_ROWS} transactions. Choose a shorter period and download it in parts.`
    );
  }
  return docs;
}

/** The balance the ledger recorded on the last entry before the period; 0 when there is none. */
async function openingPaise(userId: Types.ObjectId, period: StatementPeriod): Promise<number> {
  const previous = await WalletTransactionModel.findOne({ user_id: userId, created_at: { $lt: period.start } })
    .sort({ created_at: -1, _id: -1 })
    .select('balance_after')
    .lean<{ balance_after: number } | null>();
  return toPaise(previous?.balance_after ?? 0);
}

const uniqueIds = (values: (string | null | undefined)[]) => [...new Set(values.filter((v): v is string => !!v))];

async function withdrawalFacts(userId: Types.ObjectId, docs: LedgerDoc[]): Promise<Map<string, WithdrawalFacts>> {
  const ids = uniqueIds(docs.map((d) => d.withdrawal_id));
  if (ids.length === 0) return new Map();
  // Scoped to the owner as well as the ids: a ledger row can only ever be
  // described from the same user's own withdrawal records.
  const rows = await WalletWithdrawalModel.find({ user_id: userId, withdrawal_id: { $in: ids } })
    .select('withdrawal_id status payout_method account_number upi_id paid_at')
    .lean<WithdrawalFacts[]>();
  return new Map(rows.map((row) => [row.withdrawal_id, row]));
}

async function releaseFacts(docs: LedgerDoc[]): Promise<Map<string, ReleaseFacts>> {
  const ids = uniqueIds(docs.map((d) => d.release_id));
  if (ids.length === 0) return new Map();
  const { PaymentReleaseModel } = await import('@modules/finance/finance/paymentRelease.model');
  const rows = await PaymentReleaseModel.find({ release_id: { $in: ids } })
    .select('release_id kind pod_title')
    .lean<ReleaseFacts[]>();
  return new Map(rows.map((row) => [row.release_id, row]));
}

/** What a credit was earned as — the payout leg of the release behind it. */
const EARNING_LABEL: Record<PaymentReleaseKind, string> = {
  HOST_PAYMENT: 'Host payout',
  VENUE_BILLING: 'Venue payout',
  CLUB_ADMIN: 'Club admin share',
  ECOMM_PAYMENT: 'Product sales payout',
  VENUE_RENTAL: 'Rented items payout',
};

/** Everything but the last four characters hidden — the convention for a bank account on a statement. */
export function maskAccountNumber(value: string | null | undefined): string {
  const digits = String(value ?? '').trim();
  if (!digits) return '';
  return `${'X'.repeat(Math.max(digits.length - 4, 0))}${digits.slice(-4)}`;
}

/** A UPI id with its name part reduced to the first two characters: `me***@okhdfcbank`. */
export function maskUpiId(value: string | null | undefined): string {
  const id = String(value ?? '').trim();
  if (!id) return '';
  const at = id.indexOf('@');
  if (at < 0) return `${id.slice(0, 2)}***`;
  return `${id.slice(0, Math.min(2, at))}***${id.slice(at)}`;
}

function payoutDestination(w: WithdrawalFacts): string {
  const target = w.payout_method === 'UPI' ? maskUpiId(w.upi_id) : maskAccountNumber(w.account_number);
  return target ? `${w.payout_method} ${target}` : w.payout_method;
}

function describeWithdrawal(doc: LedgerDoc, w: WithdrawalFacts | undefined): string {
  if (!w) return doc.reason || 'Withdrawal requested';
  const base = `Withdrawal request to ${payoutDestination(w)}`;
  return w.status === 'PAID' && w.paid_at ? `${base} - paid ${appDateTime(w.paid_at)}` : base;
}

function describeEarning(doc: LedgerDoc, release: ReleaseFacts | undefined): string {
  if (!release) return doc.reason || 'Earning credit';
  const label = `Earning credit - ${EARNING_LABEL[release.kind] ?? 'Payout'}`;
  return release.pod_title ? `${label} - ${release.pod_title}` : label;
}

function describe(doc: LedgerDoc, w: WithdrawalFacts | undefined, release: ReleaseFacts | undefined): string {
  if (doc.source === 'WITHDRAWAL') return describeWithdrawal(doc, w);
  if (doc.source === 'WITHDRAWAL_REVERSAL') return doc.reason || 'Withdrawal rejected - amount returned';
  return describeEarning(doc, release);
}

function statusOf(doc: LedgerDoc, w: WithdrawalFacts | undefined): WalletStatementRowStatus {
  if (doc.source === 'WITHDRAWAL_REVERSAL') return 'REVERSED';
  if (doc.source === 'WITHDRAWAL') return w?.status ?? 'PENDING';
  return 'CREDITED';
}

interface Tally {
  credits: number;
  debits: number;
  earnings: number;
  requested: number;
  paid: number;
  pending: number;
  rejected: number;
  reversals: number;
}

const emptyTally = (): Tally => ({
  credits: 0,
  debits: 0,
  earnings: 0,
  requested: 0,
  paid: 0,
  pending: 0,
  rejected: 0,
  reversals: 0,
});

/** Which withdrawal total a requested amount counts towards, by where the request stands today. */
function withdrawalBucket(status: WalletStatementRowStatus): 'paid' | 'pending' | 'rejected' {
  if (status === 'PAID') return 'paid';
  return status === 'REJECTED' ? 'rejected' : 'pending';
}

/** Adds one ledger row to the period totals, in whole paise. */
function tallyRow(tally: Tally, doc: LedgerDoc, status: WalletStatementRowStatus, paise: number): void {
  if (doc.type === 'CREDIT') tally.credits += paise;
  else tally.debits += paise;
  if (doc.source === 'POD_COMPLETION') tally.earnings += paise;
  if (doc.source === 'WITHDRAWAL_REVERSAL') tally.reversals += paise;
  if (doc.source === 'WITHDRAWAL') {
    tally.requested += paise;
    tally[withdrawalBucket(status)] += paise;
  }
}

const totalsOf = (tally: Tally, count: number): WalletStatementTotals => ({
  transaction_count: count,
  total_credits: fromPaise(tally.credits),
  total_debits: fromPaise(tally.debits),
  earnings_credited: fromPaise(tally.earnings),
  withdrawals_requested: fromPaise(tally.requested),
  withdrawals_paid: fromPaise(tally.paid),
  withdrawals_pending: fromPaise(tally.pending),
  withdrawals_rejected: fromPaise(tally.rejected),
  reversals_credited: fromPaise(tally.reversals),
});

interface LedgerRows {
  rows: WalletStatementRow[];
  tally: Tally;
  closingPaise: number;
}

function buildRows(
  docs: LedgerDoc[],
  opening: number,
  withdrawals: Map<string, WithdrawalFacts>,
  releases: Map<string, ReleaseFacts>
): LedgerRows {
  const tally = emptyTally();
  let running = opening;
  const rows = docs.map((doc): WalletStatementRow => {
    const withdrawal = withdrawals.get(String(doc.withdrawal_id ?? ''));
    const release = releases.get(String(doc.release_id ?? ''));
    const paise = toPaise(doc.amount);
    const status = statusOf(doc, withdrawal);
    const credit = doc.type === 'CREDIT';
    running += credit ? paise : -paise;
    tallyRow(tally, doc, status, paise);
    return {
      id: String(doc._id),
      occurred_at: doc.created_at.toISOString(),
      kind: doc.source,
      reference: doc.withdrawal_id || doc.release_id || String(doc._id),
      description: describe(doc, withdrawal, release),
      debit: credit ? 0 : fromPaise(paise),
      credit: credit ? fromPaise(paise) : 0,
      balance: fromPaise(running),
      status,
    };
  });
  return { rows, tally, closingPaise: running };
}

/** Opening + credits - debits must land on the balance the ledger stored on the period's last entry. */
function isReconciled(docs: LedgerDoc[], closingPaise: number): boolean {
  const last = docs[docs.length - 1];
  // An empty period has nothing to disagree with: closing is the opening balance.
  return !last || toPaise(last.balance_after) === closingPaise;
}

async function accountOf(userId: Types.ObjectId, settings: IFinanceSettings) {
  const [user, wallet] = await Promise.all([
    UserModel.findById(userId).select('auth.email profile.first_name profile.last_name').lean<{
      auth?: { email?: string };
      profile?: { first_name?: string; last_name?: string };
    } | null>(),
    // Read, never upserted: a statement must not create a wallet as a side effect.
    WalletModel.findOne({ user_id: userId }).select('currency_symbol').lean<{ currency_symbol?: string } | null>(),
  ]);
  const email = user?.auth?.email ?? '';
  const name = [user?.profile?.first_name, user?.profile?.last_name].filter(Boolean).join(' ').trim();
  return {
    account_name: name || email,
    account_email: email,
    currency_symbol: wallet?.currency_symbol || settings.currency_symbol,
  };
}

export interface LoadedStatement {
  statement: WalletStatement;
  settings: IFinanceSettings;
}

/**
 * Build one user's statement for a period. `userId` is ALWAYS the signed-in
 * user's own id — the resolver passes `ctx.user.id` and takes no id argument,
 * so there is no way to ask for anyone else's ledger.
 */
export async function loadWalletStatement(
  userId: string,
  input: WalletStatementInput | null | undefined,
  now = new Date()
): Promise<LoadedStatement> {
  if (!Types.ObjectId.isValid(userId)) {
    throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  const period = resolveStatementPeriod(input, now);
  const owner = new Types.ObjectId(userId);
  const settings = await getFinanceSettings();
  const [docs, opening, account] = await Promise.all([
    loadLedger(owner, period),
    openingPaise(owner, period),
    accountOf(owner, settings),
  ]);
  const [withdrawals, releases] = await Promise.all([withdrawalFacts(owner, docs), releaseFacts(docs)]);
  const built = buildRows(docs, opening, withdrawals, releases);
  const reconciled = isReconciled(docs, built.closingPaise);
  if (!reconciled) {
    logs.server.warn('wallet-statement', 'loadWalletStatement', {
      msg: 'ledger does not reconcile for the period; balances withheld from the statement',
      user_id: userId,
      from: period.from,
      to: period.to,
      computed_closing: fromPaise(built.closingPaise),
      stored_closing: docs[docs.length - 1]?.balance_after,
    });
  }
  const statement: WalletStatement = {
    ...account,
    time_zone: getAppTimeZone(),
    period_from: period.from,
    period_to: period.to,
    generated_at: now.toISOString(),
    balances_reconciled: reconciled,
    opening_balance: reconciled ? fromPaise(opening) : null,
    closing_balance: reconciled ? fromPaise(built.closingPaise) : null,
    rows: reconciled ? built.rows : built.rows.map((row) => ({ ...row, balance: null })),
    totals: totalsOf(built.tally, docs.length),
  };
  return { statement, settings };
}

export type WalletStatementFormat = 'PDF' | 'CSV';

export interface WalletStatementFile {
  filename: string;
  mime: string;
  content_base64: string;
  transaction_count: number;
}

/** `duncit-withdrawal-statement-2026-04-01_to_2026-06-30.pdf`, the brand read from Finance settings. */
function statementFilename(settings: IFinanceSettings, statement: WalletStatement, extension: string): string {
  const brand = settings.business_name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join('-');
  const stem = `withdrawal-statement-${statement.period_from}_to_${statement.period_to}.${extension}`;
  return brand ? `${brand}-${stem}` : stem;
}

export const walletStatementService = {
  /** The statement as data: rows and totals for a validated period. */
  async statement(userId: string, input: WalletStatementInput | null | undefined): Promise<WalletStatement> {
    return (await loadWalletStatement(userId, input)).statement;
  },

  /** The same statement as a file. Both formats are rendered from the ONE set of rows above. */
  async file(
    userId: string,
    input: WalletStatementInput | null | undefined,
    fileFormat: WalletStatementFormat
  ): Promise<WalletStatementFile> {
    if (fileFormat !== 'PDF' && fileFormat !== 'CSV') throw badInput('Choose PDF or CSV');
    const { statement, settings } = await loadWalletStatement(userId, input);
    const transaction_count = statement.totals.transaction_count;
    if (fileFormat === 'CSV') {
      const { walletStatementCsv } = await import('./walletStatement.csv');
      return {
        filename: statementFilename(settings, statement, 'csv'),
        mime: 'text/csv',
        content_base64: Buffer.from(walletStatementCsv(statement), 'utf8').toString('base64'),
        transaction_count,
      };
    }
    const { walletStatementPdf } = await import('./walletStatement.pdf');
    const pdf = await walletStatementPdf(statement, {
      business_name: settings.business_name,
      business_address: settings.business_address,
      business_gstin: settings.business_gstin,
      support_email: settings.invoice_support_email,
      support_phone: settings.invoice_support_phone,
      logo_url: settings.invoice_logo_url,
    });
    return {
      filename: statementFilename(settings, statement, 'pdf'),
      mime: 'application/pdf',
      content_base64: pdf.toString('base64'),
      transaction_count,
    };
  },
};
