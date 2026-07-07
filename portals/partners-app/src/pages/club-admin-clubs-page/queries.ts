import { gql } from '@apollo/client';

export const MY_ADMIN_CLUBS_PAGE = gql`
  query MyAdminClubsPage($filter: MyAdminClubsFilter) {
    myAdminClubsPage(filter: $filter) {
      total
      items {
        id
        club_name
        club_description
        locality
        followers_count
        rating
        ratings_count
        is_verified
        club_feature_images_and_videos {
          url
          type
        }
      }
    }
  }
`;

export interface AdminClub {
  id: string;
  club_name: string;
  club_description: string | null;
  locality: string;
  followers_count: number;
  rating: number;
  ratings_count: number;
  is_verified: boolean;
  club_feature_images_and_videos: { url: string; type: string }[];
}

export interface AdminClubsPage {
  total: number;
  items: AdminClub[];
}
