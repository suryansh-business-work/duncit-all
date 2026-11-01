import { gql } from '@/generated/graphql';

/**
 * The product-analytics batch — the native twin of mWeb's
 * `app/productAnalytics.ts` (rule 27). Signed in or not; the server stores
 * nothing without the analytics consent the request header carries.
 */
export const RecordAppEventsDocument = gql(`
  mutation MobileRecordAppEvents($events: [AppEventInput!]!) {
    recordAppEvents(events: $events)
  }
`);
