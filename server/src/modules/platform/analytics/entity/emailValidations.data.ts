import { EmailVerificationModel, LEGACY_PORTAL } from '@modules/crm/emailVerification/emailVerification.model';
import { statusesOf, type EmailCheckFlags } from '@modules/platform/emailValidation/emailValidation.checks';
import { dayKeyExpr, inRange } from './window';

/**
 * What the Email Validations analytics page reads: every validation any
 * console ran, from the same log Admin › Email Validations › Logs lists, so a
 * figure here and the rows behind it agree.
 */

/** Rows whose status falls under `verdict`, summed inside a `$group`. */
const verdictSum = (verdict: string) => ({
  $sum: { $cond: [{ $in: ['$status', statusesOf(verdict)] }, 1, 0] },
});

const isRevalidation = { $ne: [{ $ifNull: ['$revalidated_from', null] }, null] };
const hasSuggestion = { $gt: [{ $strLenCP: { $ifNull: ['$suggestion', ''] } }, 0] };
const VERDICT_SUMS = { valid: verdictSum('VALID'), risky: verdictSum('RISKY'), invalid: verdictSum('INVALID') };

export interface VerdictCounts {
  valid: number;
  risky: number;
  invalid: number;
}

export interface ValidationDay extends VerdictCounts {
  _id: string;
  revalidations: number;
  typos: number;
}

export interface PortalRow extends VerdictCounts {
  _id: string;
}

export interface FlagCombo {
  _id: EmailCheckFlags;
  count: number;
}

export interface SourceRow {
  _id: { source: string; revalidation: boolean };
  count: number;
}

const inWindow = (from: Date, to: Date) => ({ $match: { created_at: inRange(from, to) } });

export const validationDays = (from: Date, to: Date, zone: string) =>
  EmailVerificationModel.aggregate<ValidationDay>([
    inWindow(from, to),
    {
      $group: {
        _id: dayKeyExpr('created_at', zone),
        ...VERDICT_SUMS,
        revalidations: { $sum: { $cond: [isRevalidation, 1, 0] } },
        typos: { $sum: { $cond: [hasSuggestion, 1, 0] } },
      },
    },
  ]);

/** How many different addresses were validated — one address checked five times is one. */
export async function uniqueEmails(from: Date, to: Date): Promise<number> {
  const [row] = await EmailVerificationModel.aggregate<{ count: number }>([
    inWindow(from, to),
    { $group: { _id: '$email' } },
    { $count: 'count' },
  ]);
  return row?.count ?? 0;
}

/** Verdicts per console. A check from before consoles were recorded is the CRM's. */
export const portalRows = (from: Date, to: Date) =>
  EmailVerificationModel.aggregate<PortalRow>([
    inWindow(from, to),
    { $group: { _id: { $ifNull: ['$portal', LEGACY_PORTAL] }, ...VERDICT_SUMS } },
  ]);

/**
 * The verifier's flags, one row per distinct combination. Which tests failed
 * is then worked out by the same rule the dialog shows (checksOf), so the
 * chart can never disagree with a single result. Nine booleans leave few
 * combinations in practice, whatever the number of checks.
 */
export const flagCombos = (from: Date, to: Date) =>
  EmailVerificationModel.aggregate<FlagCombo>([
    inWindow(from, to),
    {
      $group: {
        _id: {
          is_valid_syntax: '$is_valid_syntax',
          accepts_mail: '$accepts_mail',
          can_connect_smtp: '$can_connect_smtp',
          is_deliverable: '$is_deliverable',
          is_catch_all: '$is_catch_all',
          has_full_inbox: '$has_full_inbox',
          is_disabled: '$is_disabled',
          is_disposable: '$is_disposable',
          is_role_account: '$is_role_account',
        },
        count: { $sum: 1 },
      },
    },
  ]);

export const sourceRows = (from: Date, to: Date) =>
  EmailVerificationModel.aggregate<SourceRow>([
    inWindow(from, to),
    { $group: { _id: { source: '$source', revalidation: isRevalidation }, count: { $sum: 1 } } },
  ]);
