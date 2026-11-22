import { z } from 'zod';
import { isPaymentTransactionId } from '@duncit/regex';

import type { Translate } from './translate';

/** How a buyer shows that money left their account — the server's `PaymentEvidenceType`. */
export const PAYMENT_EVIDENCE_TYPES = ['SCREENSHOT', 'BANK_STATEMENT', 'TRANSACTION_ID'] as const;
export type PaymentEvidenceType = (typeof PAYMENT_EVIDENCE_TYPES)[number];

/** The evidence types proven with uploaded files rather than a typed reference. */
export type PaymentEvidenceFileType = Exclude<PaymentEvidenceType, 'TRANSACTION_ID'>;

/** At most this many files per claim — the server refuses more. */
export const PAYMENT_EVIDENCE_MAX_FILES = 5;

/**
 * The upload folder both apps send evidence to. The server keeps this folder
 * private (signed links for Finance/Support only) and out of the AI scan.
 */
export const PAYMENT_EVIDENCE_FOLDER = 'payment-evidence';

/** Each option's label — the same three choices on mWeb and native. */
export const PAYMENT_EVIDENCE_LABEL_KEYS: Readonly<Record<PaymentEvidenceType, string>> = {
  SCREENSHOT: 'mweb.payment.claim.optionScreenshot',
  BANK_STATEMENT: 'mweb.payment.claim.optionStatement',
  TRANSACTION_ID: 'mweb.payment.claim.optionTransactionId',
};

/** The line under each upload option; it receives `{max}`. */
export const PAYMENT_EVIDENCE_HINT_KEYS: Readonly<Record<PaymentEvidenceFileType, string>> = {
  SCREENSHOT: 'mweb.payment.claim.screenshotHint',
  BANK_STATEMENT: 'mweb.payment.claim.statementHint',
};

/**
 * What each file-backed option may upload, as picker MIME patterns: a
 * screenshot is an image; a bank statement is an image or a PDF. mWeb joins
 * them into the file input's `accept`, the native app hands them to the
 * document picker, and both judge the picked file with
 * {@link paymentEvidenceAccepts} — the picker filter alone can be bypassed.
 */
export const PAYMENT_EVIDENCE_MIME_TYPES: Readonly<Record<PaymentEvidenceFileType, readonly string[]>> = {
  SCREENSHOT: ['image/*'],
  BANK_STATEMENT: ['image/*', 'application/pdf'],
};

/** Whether `mimeType` is one this option accepts (`image/*` matches `image/png`). */
export function paymentEvidenceAccepts(type: PaymentEvidenceFileType, mimeType: string | null | undefined): boolean {
  const mime = (mimeType ?? '').trim().toLowerCase();
  if (!mime) return false;
  return PAYMENT_EVIDENCE_MIME_TYPES[type].some((pattern) =>
    pattern.endsWith('/*') ? mime.startsWith(pattern.slice(0, -1)) : mime === pattern,
  );
}

/**
 * "My payment was deducted but the booking was not completed": the evidence a
 * buyer gives before a PAYMENT support ticket is opened. One rule for mWeb's
 * dialog and the native sheet, and the same transaction-id pattern the server
 * judges with (@duncit/regex), so neither app accepts what the other refuses.
 *
 * Only the chosen option is judged: files for a screenshot or a statement
 * (1–5), a reference for a transaction id.
 */
export function makePaymentClaimSchema(t: Translate) {
  return z
    .object({
      evidence_type: z.enum(PAYMENT_EVIDENCE_TYPES),
      file_refs: z.array(z.string()),
      transaction_id: z.string().trim(),
    })
    .superRefine((values, ctx) => {
      if (values.evidence_type === 'TRANSACTION_ID') {
        if (!values.transaction_id) {
          ctx.addIssue({ code: 'custom', path: ['transaction_id'], message: t('mweb.payment.claim.transactionIdRequired') });
        } else if (!isPaymentTransactionId(values.transaction_id)) {
          ctx.addIssue({ code: 'custom', path: ['transaction_id'], message: t('mweb.payment.claim.transactionIdInvalid') });
        }
        return;
      }
      const files = values.file_refs.filter(Boolean);
      if (files.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['file_refs'], message: t('mweb.payment.claim.filesRequired') });
      } else if (files.length > PAYMENT_EVIDENCE_MAX_FILES) {
        ctx.addIssue({
          code: 'custom',
          path: ['file_refs'],
          message: t('mweb.payment.claim.tooManyFiles', { vars: { max: PAYMENT_EVIDENCE_MAX_FILES } }),
        });
      }
    });
}

export type PaymentClaimValues = z.infer<ReturnType<typeof makePaymentClaimSchema>>;

export const paymentClaimDefaults: PaymentClaimValues = {
  evidence_type: 'SCREENSHOT',
  file_refs: [],
  transaction_id: '',
};

/** The server's `SubmitPaymentDeductionClaimInput`. */
export interface PaymentClaimInput {
  payment_doc_id: string;
  evidence_type: PaymentEvidenceType;
  file_refs: string[] | null;
  transaction_id: string | null;
  client_request_id: string;
}

/**
 * The claim as the server takes it: only the chosen option's evidence is sent,
 * so files uploaded before the buyer switched to a transaction id are not.
 */
export function paymentClaimInput(
  paymentDocId: string,
  values: PaymentClaimValues,
  clientRequestId: string,
): PaymentClaimInput {
  const byReference = values.evidence_type === 'TRANSACTION_ID';
  return {
    payment_doc_id: paymentDocId,
    evidence_type: values.evidence_type,
    file_refs: byReference ? null : values.file_refs.filter(Boolean),
    transaction_id: byReference ? values.transaction_id.trim() : null,
    client_request_id: clientRequestId,
  };
}
