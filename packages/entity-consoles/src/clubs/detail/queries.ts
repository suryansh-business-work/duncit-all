import { gql } from '@apollo/client';

/**
 * The club, the ids of the hosts its Hosts tab lists, and how many pods it has.
 *
 * The pod count rides as an alias on the SAME table engine the Pods tab reads,
 * with `page_size: 1` because only `total` is used — so the stat and the tab
 * cannot disagree, and no page of rows is fetched to be thrown away. `$clubKey`
 * is the club id again, typed `String!` because that is what a table filter's
 * `value` takes.
 */
export const CLUB_DETAIL = gql`
  query AdminClubDetail($id: ID!, $clubKey: String!) {
    club(club_doc_id: $id) {
      id
      club_id
      club_name
      club_description
      category_id
      super_category_id
      is_verified
      is_active
      locality
      followers_count
      matched_venues_count
      rating
      ratings_count
      club_whats_app_community_link
      club_whats_app_group_link
      who_we_are
      what_we_do
      perks
      values
      faqs {
        question
        answer
      }
      club_feature_images_and_videos {
        url
        type
      }
      club_moments {
        url
        type
      }
      admin_user_ids
      club_admins {
        id
        name
        avatar_url
      }
      hosts {
        id
      }
    }
    podCount: podsTable(
      query: { page_size: 1, filters: [{ field: "club_id", op: eq, value: $clubKey }] }
    ) {
      total
    }
  }
`;

/**
 * The Club Admin RECORD behind each of a club's admins.
 *
 * A club names its admins by account (`admin_user_ids`), while their record is
 * keyed by its own id — so this is the one read that turns a name on the club
 * into a way into that person's full record.
 */
export const CLUB_ADMIN_RECORD_IDS = gql`
  query ClubConsoleAdminRecordIds($query: TableQueryInput) {
    clubAdminProfilesTable(query: $query) {
      rows {
        id
        user_id
      }
    }
  }
`;
