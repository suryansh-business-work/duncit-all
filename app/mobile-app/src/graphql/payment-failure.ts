import { gql } from '@/generated/graphql';

/** Records a Razorpay checkout failure on the buyer's own payment (idempotent per client_request_id). */
export const MobileReportPaymentFailureDocument = gql(`
  mutation MobileReportPaymentFailure($input: ReportPaymentFailureInput!) {
    reportPaymentFailure(input: $input) {
      case_id
    }
  }
`);

/** "My payment was deducted but booking was not completed" — opens a PAYMENT ticket. */
export const MobileSubmitPaymentDeductionClaimDocument = gql(`
  mutation MobileSubmitPaymentDeductionClaim($input: SubmitPaymentDeductionClaimInput!) {
    submitPaymentDeductionClaim(input: $input) {
      case_id
      ticket_no
      already_open
    }
  }
`);
