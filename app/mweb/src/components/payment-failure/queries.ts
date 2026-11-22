import { gql } from '@apollo/client';

/** Records a Razorpay checkout failure on the buyer's own payment (idempotent per client_request_id). */
export const REPORT_PAYMENT_FAILURE = gql`
  mutation ReportPaymentFailure($input: ReportPaymentFailureInput!) {
    reportPaymentFailure(input: $input) {
      case_id
    }
  }
`;

/** "My payment was deducted but booking was not completed" — opens a PAYMENT ticket. */
export const SUBMIT_PAYMENT_DEDUCTION_CLAIM = gql`
  mutation SubmitPaymentDeductionClaim($input: SubmitPaymentDeductionClaimInput!) {
    submitPaymentDeductionClaim(input: $input) {
      case_id
      ticket_no
      already_open
    }
  }
`;
