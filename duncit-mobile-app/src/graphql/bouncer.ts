import { gql } from '@/generated/graphql';

/** Pods the user actively joined — scopes the live support tools (SOS/feedback).
 * RN port of mWeb's MY_ACTIVE_SUPPORT_PODS. */
export const MobileActiveSupportPodsDocument = gql(`
  query MobileActiveSupportPods {
    myPodMemberships(status: JOINED) {
      id
      pod {
        id
        pod_id
        pod_title
        pod_date_time
        pod_end_date_time
      }
    }
  }
`);

/** Support phone target for the Callback screen — mWeb's SUPPORT_CALL_TARGET. */
export const MobileSupportCallTargetDocument = gql(`
  query MobileSupportCallTarget {
    bouncerSupportTarget {
      phone
      available
    }
  }
`);

/** The user's active SOS for a pod (if any) — mWeb's MY_ACTIVE_SOS. */
export const MobileActiveSosDocument = gql(`
  query MobileActiveBouncerSos($pod_id: ID!) {
    myActiveBouncerSos(pod_id: $pod_id) {
      id
      status
      message
      created_at
      acknowledged_at
    }
  }
`);

/** Raise an SOS at a live pod — mWeb's RAISE_SOS. */
export const MobileRaiseSosDocument = gql(`
  mutation MobileRaiseBouncerSos($input: RaiseSosInput!) {
    raiseBouncerSos(input: $input) {
      id
      status
      message
      created_at
    }
  }
`);

/** Request a callback from support — mWeb's REQUEST_CALLBACK. */
export const MobileRequestCallbackDocument = gql(`
  mutation MobileRequestBouncerCallback($input: RequestCallbackInput!) {
    requestBouncerCallback(input: $input) {
      id
      status
      created_at
    }
  }
`);

/** Submit live feedback for a pod — mWeb's SUBMIT_FEEDBACK. */
export const MobileSubmitFeedbackDocument = gql(`
  mutation MobileSubmitBouncerFeedback($input: SubmitBouncerFeedbackInput!) {
    submitBouncerFeedback(input: $input) {
      id
      rating
      category
      created_at
    }
  }
`);
