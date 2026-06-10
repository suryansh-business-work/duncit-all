import { gql } from '@apollo/client';

export const PAYMENT_RELEASE_REQUESTS = gql`
  query PaymentReleaseRequests($filter: PaymentReleaseFilterInput) {
    paymentReleaseRequests(filter: $filter) {
      id
      release_id
      kind
      status
      pod_title
      beneficiary_name
      beneficiary_email
      amount_requested
      bill_url
      evidence_media {
        url
        type
      }
      notes
      requested_at
      approval_type
      approved_amount
      approval_reason
      reviewed_at
    }
  }
`;

export const REVIEW_PAYMENT_RELEASE = gql`
  mutation ReviewPaymentRelease($id: ID!, $input: ReviewPaymentReleaseInput!) {
    reviewPaymentReleaseRequest(request_id: $id, input: $input) {
      id
      status
      approval_type
      approved_amount
      approval_reason
      reviewed_at
    }
  }
`;

export type ReleaseKind = 'VENUE_BILLING' | 'HOST_PAYMENT';
export type ReleaseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';