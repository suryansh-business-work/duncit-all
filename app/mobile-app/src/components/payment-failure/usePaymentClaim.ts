import { useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { parseIssue } from '@duncit/errors';
import { paymentClaimInput, type PaymentClaimValues } from '@duncit/forms/schemas';
import { logs } from '@duncit/logs';

import { useTranslation } from '@/hooks/useTranslation';
import { submitPaymentClaim, type PaymentClaimResult } from './paymentFailureApi';

/**
 * Files "my payment was deducted but the booking was not completed" against
 * one payment. The request id is minted once per opened sheet, so a resend
 * after a dropped connection returns the same ticket instead of a second one.
 * The twin of mWeb's `usePaymentClaim` (rule 27).
 */
export function usePaymentClaim(paymentDocId: string) {
  const { t } = useTranslation();
  const [requestId] = useState(() => randomUUID());
  const [result, setResult] = useState<PaymentClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (values: PaymentClaimValues) => {
    setError(null);
    setSubmitting(true);
    const fallbackMessage = t('mweb.payment.claim.error');
    try {
      const claim = await submitPaymentClaim(paymentClaimInput(paymentDocId, values, requestId));
      if (claim?.ticket_no) setResult(claim);
      else setError(fallbackMessage);
    } catch (err: unknown) {
      const issue = parseIssue(err, { operation: 'submitPaymentDeductionClaim', fallbackMessage });
      logs.mobileApp.error('PaymentClaim', 'submitPaymentDeductionClaim', {
        code: issue.code,
        kind: issue.kind,
      });
      // The buyer's own input to fix is said in the server's words; anything
      // else gets the plain retry line.
      setError(issue.kind === 'VALIDATION' ? issue.message : fallbackMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, submitting, result, error };
}
