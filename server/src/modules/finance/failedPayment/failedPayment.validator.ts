import { GraphQLError } from 'graphql';
import { z } from 'zod';
import { EVIDENCE_TYPES, MAX_EVIDENCE_FILES, REVIEW_DECISIONS } from './failedPayment.types';

/**
 * Parse or refuse. The FIRST problem becomes the error message itself, with
 * code BAD_USER_INPUT, because the apps show that message to the buyer verbatim
 * (a generic "Validation failed" would tell them nothing).
 */
export function parseInput<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const errors = result.error.issues.map((issue) => issue.message);
  throw new GraphQLError(errors[0] ?? 'Invalid input', { extensions: { code: 'BAD_USER_INPUT', errors } });
}

/**
 * Input rules for the failed-payment mutations. GraphQL already enforces the
 * types; these add lengths, shapes and the cross-field rules. Clients send
 * absent optionals as explicit `null`, so every optional is `nullish`.
 */

/**
 * A payment / bank transaction reference: letters, digits, `_` and `-`, 6–40
 * characters — Razorpay `pay_…` ids and bank UTR / RRN numbers alike.
 *
 * The SAME pattern ships to the clients as `PAYMENT_TRANSACTION_ID` from
 * `@duncit/regex`. `server/src` imports no `@duncit/*` package by design, so
 * it is mirrored rather than shared (as `USERNAME` is) — keep the two in sync.
 */
export const PAYMENT_TRANSACTION_ID_REGEX = /^[A-Za-z0-9_-]{6,40}$/;

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const id = (label: string) => z.string().trim().regex(OBJECT_ID, `${label} is not valid`);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value ?? '');
const requestId = z.string().trim().min(8, 'client_request_id is required').max(100);

export const reportPaymentFailureSchema = z.object({
  payment_doc_id: id('Payment'),
  kind: z.enum(['CANCELLED', 'TIMEOUT', 'FAILED']),
  razorpay_payment_id: optionalText(60),
  razorpay_order_id: optionalText(60),
  error_code: optionalText(120),
  error_description: optionalText(500),
  error_reason: optionalText(200),
  error_source: optionalText(120),
  error_step: optionalText(120),
  retry_shown: z.boolean(),
  attempt_number: z.number().int().min(1).max(1000),
  client_request_id: requestId,
});
export type ReportPaymentFailureInput = z.infer<typeof reportPaymentFailureSchema>;

export const submitClaimSchema = z
  .object({
    payment_doc_id: id('Payment'),
    evidence_type: z.enum(EVIDENCE_TYPES),
    file_refs: z
      .array(z.string().trim().min(1).max(1000))
      .nullish()
      .transform((refs) => refs ?? []),
    transaction_id: optionalText(60),
    client_request_id: requestId,
  })
  .superRefine((input, ctx) => {
    if (input.evidence_type === 'TRANSACTION_ID') {
      if (!PAYMENT_TRANSACTION_ID_REGEX.test(input.transaction_id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['transaction_id'],
          message: 'Enter a valid transaction ID (6–40 letters, digits, - or _).',
        });
      }
      return;
    }
    if (input.file_refs.length < 1 || input.file_refs.length > MAX_EVIDENCE_FILES) {
      ctx.addIssue({
        code: 'custom',
        path: ['file_refs'],
        message: `Attach between 1 and ${MAX_EVIDENCE_FILES} files.`,
      });
    }
  });
export type SubmitClaimInput = z.infer<typeof submitClaimSchema>;

export const reviewSchema = z
  .object({
    case_id: id('Case'),
    decision: z.enum(REVIEW_DECISIONS),
    note: z.string().trim().max(1000),
    client_request_id: optionalText(100),
  })
  .superRefine((input, ctx) => {
    if (input.decision === 'REJECTED' && !input.note) {
      ctx.addIssue({ code: 'custom', path: ['note'], message: 'Add a note explaining the rejection.' });
    }
  });
export type ReviewInput = z.infer<typeof reviewSchema>;

export const markNotRefundableSchema = z.object({
  case_id: id('Case'),
  note: z.string().trim().min(1, 'Add a note for the buyer.').max(1000),
  client_request_id: optionalText(100),
});
export type MarkNotRefundableInput = z.infer<typeof markNotRefundableSchema>;

export const refundSchema = z.object({ case_id: id('Case'), client_request_id: requestId });

export const caseIdSchema = z.object({ case_id: id('Case') });

export const summarizeSchema = z.object({ case_id: id('Case'), force: z.boolean().nullish() });
