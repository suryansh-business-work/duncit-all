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

/** The user's own callback history with call outcome — mWeb's MY_CALLBACK_REQUESTS. */
export const MobileMyCallbacksDocument = gql(`
  query MobileMyCallbackRequests {
    myCallbackRequests {
      id
      reason
      status
      contacted_at
      duration_seconds
      conclusion
      created_at
    }
  }
`);

/** An attended pod the user has not yet rated — drives the post-pod feedback pop-up. */
export const MobilePendingPodFeedbackDocument = gql(`
  query MobilePendingPodFeedback {
    myPendingPodFeedback {
      id
      title
    }
  }
`);

/** Rate an attended pod — mWeb's SUBMIT_FEEDBACK. */
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
