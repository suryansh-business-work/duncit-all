import { gql } from '@/generated/graphql';

/**
 * The live Duncit statuses for the home rail — every GLOBAL one plus the ones
 * published to the city the viewer has SELECTED (the location picker's choice,
 * not the profile city). Marketing publishes them from the portal; the apps show
 * them as one pinned tile at the head of the rail.
 *
 * Never cached: `seen_by_me` is per viewer and the rail's ring reads it.
 */
export const OfficialStatusesDocument = gql(`
  query MobileOfficialStatuses($locationId: ID) {
    officialStatuses(location_doc_id: $locationId) {
      id
      media_url
      media_type
      caption
      link_url
      expires_at
      seen_by_me
    }
  }
`);

/** Marks one Duncit status watched, so its ring stops showing as unseen. */
export const RecordOfficialStatusViewDocument = gql(`
  mutation MobileRecordOfficialStatusView($id: ID!) {
    recordOfficialStatusView(status_doc_id: $id)
  }
`);
