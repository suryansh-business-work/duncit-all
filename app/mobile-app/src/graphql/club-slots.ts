import { gql } from '@/generated/graphql';

/** Create Pod step 1 — ask a club's admins to get its venues to open slots.
 * Twin of mWeb's RequestClubVenueSlots (rule 27). */
export const RequestClubVenueSlotsDocument = gql(`
  mutation MobileRequestClubVenueSlots($club_doc_id: ID!) {
    requestClubVenueSlots(club_doc_id: $club_doc_id) {
      status
      notified
    }
  }
`);
