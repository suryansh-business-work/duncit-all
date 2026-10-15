import { gql } from '@/generated/graphql';

/** Whether the signed-in member already asked this host or venue for an event —
 * RN port of mWeb's MY_EVENT_REQUEST_STATE. */
export const MobileMyEventRequestStateDocument = gql(`
  query MobileMyEventRequestState($target_type: EventRequestTarget!, $target_id: ID!) {
    myEventRequestState(target_type: $target_type, target_id: $target_id) {
      is_owner
      requested
      request_id
      requested_at
    }
  }
`);

/** Ask for an event; answers with the member's (one) open request. */
export const MobileRequestEventDocument = gql(`
  mutation MobileRequestEvent($input: RequestEventInput!) {
    requestEvent(input: $input) {
      is_owner
      requested
      request_id
      requested_at
    }
  }
`);
