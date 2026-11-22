import type { PaymentClaimInput } from '@duncit/forms/schemas';
import type { PaymentFailureReportInput } from '@duncit/utils';

import {
  MobileReportPaymentFailureDocument,
  MobileSubmitPaymentDeductionClaimDocument,
} from '@/graphql/payment-failure';
import { graphqlRequest } from '@/services/graphql.client';

export interface PaymentClaimResult {
  case_id: string;
  ticket_no: string;
  already_open: boolean;
}

/*
 * The inputs are built by the shared helpers (@duncit/utils, @duncit/forms),
 * whose `kind` / `evidence_type` are the server's enum values as plain strings;
 * this app's codegen emits TS enums for them, hence the `as never` on those two
 * fields only — the same bridge `createTicket` uses for its category.
 */

/** Records a checkout failure against the buyer's payment. Idempotent per request id. */
export async function recordPaymentFailure(input: PaymentFailureReportInput): Promise<void> {
  await graphqlRequest(
    MobileReportPaymentFailureDocument,
    { input: { ...input, kind: input.kind as never } },
    { auth: true },
  );
}

/** Opens (or returns the already-open) PAYMENT ticket for a deducted payment. */
export async function submitPaymentClaim(
  input: PaymentClaimInput,
): Promise<PaymentClaimResult | null> {
  const data = await graphqlRequest(
    MobileSubmitPaymentDeductionClaimDocument,
    { input: { ...input, evidence_type: input.evidence_type as never } },
    { auth: true },
  );
  return data.submitPaymentDeductionClaim ?? null;
}
