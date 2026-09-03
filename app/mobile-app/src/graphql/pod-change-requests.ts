import { gql } from '@/generated/graphql';

/**
 * Request Change — the partner's end of it, on a phone.
 *
 * The selection is spelled out in full rather than built from a shared
 * fragment constant: the native codegen reads the STRING LITERAL passed to
 * `gql()`, so an interpolated document reports success and emits no types and
 * no registered operation at all. mWeb's twin is
 * `packages/pod-change-requests/src/queries.ts` — keep the two in step
 * (rule 27).
 */
export const PodChangeBoardDocument = gql(`
  query MobilePodChangeBoard {
    myPodChangeBoard {
      venue_penalty
      host_penalty
      club_admin_penalty
      mine {
        id
        change_request_no
        role
        status
        resolution
        reason
        health_penalty
        attendees_at_request
        pod {
          id
          pod_slug
          pod_title
          pod_date_time
          club_slug
          attendee_count
        }
        pod_cancelled
        requested_by {
          user_id
          full_name
          email
          phone
        }
        from_venue_id
        from_venue_name
        from_club_id
        from_club_name
        offer {
          user_id
          display_name
          venue_id
          venue_name
          venue_slot_id
          slot_start_at
          slot_end_at
          slot_price
          club_id
          status
          offered_at
          responded_at
          pass_reason
          contact {
            user_id
            full_name
            email
            phone
          }
        }
        created_at
        resolved_at
      }
      incoming {
        id
        change_request_no
        role
        status
        resolution
        reason
        health_penalty
        attendees_at_request
        pod {
          id
          pod_slug
          pod_title
          pod_date_time
          club_slug
          attendee_count
        }
        pod_cancelled
        requested_by {
          user_id
          full_name
          email
          phone
        }
        from_venue_id
        from_venue_name
        from_club_id
        from_club_name
        offer {
          user_id
          display_name
          venue_id
          venue_name
          venue_slot_id
          slot_start_at
          slot_end_at
          slot_price
          club_id
          status
          offered_at
          responded_at
          pass_reason
          contact {
            user_id
            full_name
            email
            phone
          }
        }
        created_at
        resolved_at
      }
    }
  }
`);

export const RequestPodChangeDocument = gql(`
  mutation MobileRequestPodChange($pod_doc_id: ID!, $role: PodChangeRole!, $reason: String) {
    requestPodChange(pod_doc_id: $pod_doc_id, role: $role, reason: $reason) {
      id
      change_request_no
      status
      health_penalty
    }
  }
`);

export const RespondToPodChangeDocument = gql(`
  mutation MobileRespondToPodChange(
    $request_id: ID!
    $decision: PodChangeDecision!
    $reason: String
  ) {
    respondToPodChange(request_id: $request_id, decision: $decision, reason: $reason) {
      id
      status
      resolution
    }
  }
`);

export const WithdrawPodChangeDocument = gql(`
  mutation MobileWithdrawPodChange($request_id: ID!) {
    withdrawPodChange(request_id: $request_id) {
      id
      status
    }
  }
`);
