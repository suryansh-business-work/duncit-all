import { z } from 'zod';

export const DECISIONS = ['APPROVE', 'PARTIAL', 'REJECT'] as const;
export type DecisionChoice = (typeof DECISIONS)[number];

/** The smallest amount the server accepts for a partial approval. */
export const MIN_APPROVED_AMOUNT = 1;
export const MAX_REASON = 500; // WalletWithdrawal.decision_reason maxlength
const MIN_REASON = 3;

/** Messages arrive already translated, so the schema stays a pure function of its inputs. */
export interface DecisionMessages {
  reasonRequired: string;
  reasonTooLong: string;
  amountRequired: string;
  amountBelowRequested: string;
  amountPrecision: string;
  acknowledgeRequired: string;
}

export interface DecisionContext {
  /** What the person asked for — a partial approval must stay below it. */
  requested: number;
  /** The account is not on a verified record, so approving needs an explicit acknowledgement. */
  needsAcknowledgement: boolean;
}

/** More than two decimal places is not a rupee amount. */
const hasMoreThanTwoDecimals = (value: string) => /\.\d{3,}$/.test(value);

/**
 * The review dialog's form. Reason is required for a rejection and a partial
 * approval (the person reads it), the approved amount only for a partial one,
 * and the acknowledgement only when the account is not verified and money is
 * actually going out. The server enforces every one of these again.
 */
export const buildDecisionSchema = (context: DecisionContext, messages: DecisionMessages) =>
  z
    .object({
      decision: z.enum(DECISIONS),
      approved_amount: z.string().trim(),
      reason: z.string().trim().max(MAX_REASON, messages.reasonTooLong),
      acknowledge_unverified_account: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (values.decision !== 'APPROVE' && values.reason.length < MIN_REASON) {
        ctx.addIssue({ code: 'custom', path: ['reason'], message: messages.reasonRequired });
      }
      if (values.decision === 'PARTIAL') {
        const amount = Number(values.approved_amount);
        if (!values.approved_amount || !Number.isFinite(amount) || amount < MIN_APPROVED_AMOUNT) {
          ctx.addIssue({ code: 'custom', path: ['approved_amount'], message: messages.amountRequired });
        } else if (hasMoreThanTwoDecimals(values.approved_amount)) {
          ctx.addIssue({ code: 'custom', path: ['approved_amount'], message: messages.amountPrecision });
        } else if (amount >= context.requested) {
          ctx.addIssue({ code: 'custom', path: ['approved_amount'], message: messages.amountBelowRequested });
        }
      }
      if (values.decision !== 'REJECT' && context.needsAcknowledgement && !values.acknowledge_unverified_account) {
        ctx.addIssue({
          code: 'custom',
          path: ['acknowledge_unverified_account'],
          message: messages.acknowledgeRequired,
        });
      }
    });

export type DecisionFormValues = z.infer<ReturnType<typeof buildDecisionSchema>>;

export const DEFAULT_DECISION_VALUES: DecisionFormValues = {
  decision: 'APPROVE',
  approved_amount: '',
  reason: '',
  acknowledge_unverified_account: false,
};

/** The mutation input for one submitted form. */
export function toDecisionInput(values: DecisionFormValues) {
  return {
    decision: values.decision,
    approved_amount: values.decision === 'PARTIAL' ? Number(values.approved_amount) : null,
    reason: values.decision === 'APPROVE' ? null : values.reason,
    acknowledge_unverified_account: values.decision === 'REJECT' ? false : values.acknowledge_unverified_account,
  };
}
