import { gql } from '@apollo/client';

// Reuse the survey-gate building blocks — do NOT duplicate the category/survey
// flow or its GraphQL. The host-apply flow walks the SAME Super → Category → Sub
// → category-survey, but submits to submitHostRequest (no meeting/thanks).
export { ACTIVE_SURVEY_FOR } from '../survey-gate/queries';
export type { ActiveSurvey } from '../survey-gate/queries';
export type { CategoryScope } from '../survey-gate/CategoryStep';
export type { SurveyAnswerInput } from '../survey-gate/SurveyStepper';

export type HostRequestStatus = 'REQUESTED' | 'ACKNOWLEDGED' | 'APPROVED' | 'REJECTED';

export interface MyHostRequest {
  id: string;
  request_no: string;
  status: HostRequestStatus;
  super_category_name: string;
  category_name: string;
  sub_category_name: string;
  created_at: string;
}

export interface SubmitHostRequestInput {
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
  survey_id?: string | null;
  answers?: { qid: string; value?: string | null; values?: string[] }[];
}

export const MY_HOST_REQUEST = gql`
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
`;

export const SUBMIT_HOST_REQUEST = gql`
  mutation SubmitHostRequest($input: SubmitHostRequestInput!) {
    submitHostRequest(input: $input) {
      id
      request_no
      status
    }
  }
`;

/** Active (in-process) requests lock the banner to a read-only "Applied". */
const ACTIVE_STATUSES = new Set<HostRequestStatus>(['REQUESTED', 'ACKNOWLEDGED']);

/**
 * Banner CTA state from the caller's latest active request.
 * null → can apply; an active (REQUESTED|ACKNOWLEDGED) request → locked "Applied";
 * terminal/anything else → can apply again.
 */
export function applyButtonState(
  myHostRequest: Pick<MyHostRequest, 'status'> | null | undefined,
): { label: string; disabled: boolean } {
  if (myHostRequest && ACTIVE_STATUSES.has(myHostRequest.status)) {
    return { label: 'Applied', disabled: true };
  }
  return { label: 'Apply Now', disabled: false };
}
