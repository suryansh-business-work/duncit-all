import { z } from 'zod';
import {
  resolveStatementRange,
  STATEMENT_FORMATS,
  STATEMENT_MAX_DAYS,
  STATEMENT_PRESETS,
  STATEMENT_RANGE_ERROR_KEYS,
  statementRangeError,
  type StatementFormat,
  type StatementPreset,
  type StatementRange,
} from '@duncit/utils';

import type { Translate } from './translate';

/** The "Download statement" form's own state. `from` / `to` are `yyyy-MM-dd`, used only for a custom period. */
export interface WalletStatementValues {
  preset: StatementPreset;
  from: string;
  to: string;
  format: StatementFormat;
}

/** Opens on the current month as a PDF — the statement most people come for. */
export const blankWalletStatementValues: WalletStatementValues = {
  preset: 'THIS_MONTH',
  from: '',
  to: '',
  format: 'PDF',
};

/**
 * The statement form contract the partner console, mWeb and the native app
 * share.
 *
 * A preset needs no checking — its days are computed, not typed. Only a CUSTOM
 * period is validated, with the same rules the server enforces (both days set,
 * the right way round, not in the future, at most one financial year), so a
 * bad range is refused beside the field instead of by a server error.
 *
 * @param now The surface's clock (`useDateFormat().now()`), so "today" follows
 *   the admin's time source.
 * @param timeZone The business time zone (`useDateFormat().timeZone`) — "today"
 *   and the financial year are read there, never in the device's zone.
 * @param t The reader's translator — the messages are `withdraw.statement.*`.
 */
export function makeWalletStatementSchema(now: Date, timeZone: string, t: Translate) {
  return z
    .object({
      preset: z.enum(STATEMENT_PRESETS),
      from: z.string().trim(),
      to: z.string().trim(),
      format: z.enum(STATEMENT_FORMATS),
    })
    .superRefine((values, ctx) => {
      if (values.preset !== 'CUSTOM') return;
      const error = statementRangeError({ from: values.from, to: values.to }, now, timeZone);
      if (!error) return;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        // A missing start day is the start box's problem; everything else is
        // fixed by moving the end day.
        path: [error === 'MISSING' && !values.from ? 'from' : 'to'],
        message: t(STATEMENT_RANGE_ERROR_KEYS[error], { vars: { days: STATEMENT_MAX_DAYS } }),
      });
    });
}

/** What `myWalletStatementFile` answers with — the statement as a file to save. */
export interface WalletStatementFile {
  filename: string;
  mime: string;
  content_base64: string;
  /** 0 for a nil statement: the period had no transactions. */
  transaction_count: number;
}

/**
 * What the last download attempt came to. One shape for all three surfaces so
 * each renders the same three states: nothing yet, downloaded (with a note when
 * the period was empty), or failed with a way to retry.
 */
export type WalletStatementOutcome =
  | { kind: 'idle' }
  | { kind: 'done'; empty: boolean }
  | { kind: 'failed'; message: string };

export const WALLET_STATEMENT_IDLE: WalletStatementOutcome = { kind: 'idle' };

/** The outcome for a file that arrived. An empty period still downloads — a nil statement. */
export const walletStatementDone = (
  file: Readonly<Pick<WalletStatementFile, 'transaction_count'>>,
): WalletStatementOutcome => ({ kind: 'done', empty: file.transaction_count === 0 });

/** The `myWalletStatementFile` variables: the period as two days, and the format. */
export interface WalletStatementVariables {
  input: StatementRange;
  format: StatementFormat;
}

/** Maps the validated values onto the query's variables, resolving a preset to its days. */
export function buildWalletStatementVariables(
  values: Readonly<WalletStatementValues>,
  now: Date,
  timeZone: string,
): WalletStatementVariables {
  return { input: resolveStatementRange(values, now, timeZone), format: values.format };
}
