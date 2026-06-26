import type { ResultOf } from '@graphql-typed-document-node/core';

import { gql } from '@/generated/graphql';

/**
 * Host Requests — an already-APPROVED host applies to host in ANOTHER category
 * without restarting onboarding. `myHostRequest` returns the latest ACTIVE
 * (REQUESTED|ACKNOWLEDGED) request and drives the Host Studio banner's
 * Apply-Now / Applied lock; `submitHostRequest` files a new request.
 */
export const MyHostRequestDocument = gql(`
  query MyHostRequest {
    myHostRequest {
      id
      request_no
      status
      super_category_name
      category_name
      sub_category_name
      created_at
    }
  }
`);

export const SubmitHostRequestDocument = gql(`
  mutation SubmitHostRequest($input: SubmitHostRequestInput!) {
    submitHostRequest(input: $input) {
      id
      request_no
      status
    }
  }
`);

export type MyHostRequest = NonNullable<ResultOf<typeof MyHostRequestDocument>['myHostRequest']>;

/**
 * Banner button state from the caller's active host request. A pending request
 * (REQUESTED or ACKNOWLEDGED) locks the button to "Applied"; otherwise the host
 * can apply again. Terminal/absent requests fall through to "Apply Now".
 */
export function applyButtonState(req: MyHostRequest | null): { label: string; disabled: boolean } {
  if (req && (req.status === 'REQUESTED' || req.status === 'ACKNOWLEDGED')) {
    return { label: 'Applied', disabled: true };
  }
  return { label: 'Apply Now', disabled: false };
}
