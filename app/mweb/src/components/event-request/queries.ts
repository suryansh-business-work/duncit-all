import { gql } from '@apollo/client';

export type EventRequestTarget = 'HOST' | 'VENUE';

export interface MyEventRequestState {
  is_owner: boolean;
  requested: boolean;
  request_id: string | null;
  requested_at: string | null;
}

/** Whether the signed-in member already asked this host or venue for an event. */
export const MY_EVENT_REQUEST_STATE = gql`
  query MyEventRequestState($target_type: EventRequestTarget!, $target_id: ID!) {
    myEventRequestState(target_type: $target_type, target_id: $target_id) {
      is_owner
      requested
      request_id
      requested_at
    }
  }
`;

/** Ask for an event; answers with the member's (one) open request. */
export const REQUEST_EVENT = gql`
  mutation RequestEvent($input: RequestEventInput!) {
    requestEvent(input: $input) {
      is_owner
      requested
      request_id
      requested_at
    }
  }
`;
