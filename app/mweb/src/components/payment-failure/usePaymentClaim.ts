import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import type { MutationSubmitPaymentDeductionClaimArgs, PaymentDeductionClaimResult } from '@duncit/gql-types';
import { parseIssue } from '@duncit/errors';
import { paymentClaimInput, type PaymentClaimValues } from '@duncit/forms/schemas';
import { logs } from '@duncit/logs';
import { useTranslation } from '../../i18n/useTranslation';
import { SUBMIT_PAYMENT_DEDUCTION_CLAIM } from './queries';

export type PaymentClaimResult = Pick<PaymentDeductionClaimResult, 'case_id' | 'ticket_no' | 'already_open'>;

/**
 * Files "my payment was deducted but the booking was not completed" against
 * one payment. The request id is minted once per opened dialog, so a resend
 * after a dropped connection returns the same ticket instead of a second one.
 * The native twin is `usePaymentClaim` in the app (rule 27).
 */
export function usePaymentClaim(paymentDocId: string) {
  const { t } = useTranslation();
  const [requestId] = useState(() => globalThis.crypto.randomUUID());
  const [result, setResult] = useState<PaymentClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitClaim, { loading }] = useMutation<
    { submitPaymentDeductionClaim: PaymentClaimResult },
    MutationSubmitPaymentDeductionClaimArgs
  >(SUBMIT_PAYMENT_DEDUCTION_CLAIM);

  const submit = async (values: PaymentClaimValues) => {
    setError(null);
    const fallbackMessage = t('mweb.payment.claim.error');
    try {
      const res = await submitClaim({ variables: { input: paymentClaimInput(paymentDocId, values, requestId) } });
      const claim = res.data?.submitPaymentDeductionClaim;
      if (claim?.ticket_no) setResult(claim);
      else setError(fallbackMessage);
    } catch (err: unknown) {
      const issue = parseIssue(err, { operation: 'submitPaymentDeductionClaim', fallbackMessage });
      logs.mWeb.error('PaymentClaim', 'submitPaymentDeductionClaim', { code: issue.code, kind: issue.kind });
      // The buyer's own input to fix is said in the server's words; anything
      // else gets the plain retry line.
      setError(issue.kind === 'VALIDATION' ? issue.message : fallbackMessage);
    }
  };

  return { submit, submitting: loading, result, error };
}
