import { gql } from '@/generated/graphql';

/**
 * Time clash before a booking — the same operation mWeb sends
 * (`MY_BOOKING_CLASHES_SDL` in `@duncit/utils`), re-declared inline because
 * the app's codegen only sees documents written in this workspace.
 */
export const MyBookingClashesDocument = gql(`
  query MobileMyBookingClashes($pod_doc_ids: [ID!]!) {
    myBookingClashes(pod_doc_ids: $pod_doc_ids) {
      target_pod_id
      pod_id
      pod_slug
      club_slug
      pod_title
      pod_date_time
      pod_end_date_time
    }
  }
`);
