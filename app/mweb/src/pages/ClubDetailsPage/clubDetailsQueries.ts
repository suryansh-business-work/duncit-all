import { gql } from '@apollo/client';

export const CLUB_BY_SLUG = gql`
  query ClubBySlug($slug: String!) {
    clubBySlug(club_slug: $slug) {
      id
      club_id
      club_name
      club_description
      club_feature_images_and_videos {
        url
        type
      }
      club_moments {
        url
        type
      }
      club_whats_app_community_link
      club_whats_app_announcement_link
      club_whats_app_group_link
      meetup_venues_id
      followers_count
      hosts {
        id
        name
        avatar_url
      }
      category_id
      super_category_id
    }
  }
`;

export const CLUB_DETAILS_RELATED = gql`
  query ClubDetailsRelated($id: ID!) {
    clubPods: pods(filter: { club_id: $id, is_active: true }) {
      id
      pod_id
      pod_title
      pod_date_time
      pod_end_date_time
      pod_type
      pod_amount
      pod_attendees
      no_of_spots
      place_label
      place_detail
      club_slug
      pod_images_and_videos {
        url
        type
      }
    }
    publicVenues {
      id
      venue_name
      address_line1
      address_line2
      locality
      city
      state
      country
      postal_code
      lat
      lng
    }
  }
`;

export const CLUB_STORIES = gql`
  query ClubStories($id: ID!) {
    clubStories(club_id: $id) {
      id
      image_url
      media_type
      caption
      created_at
      author {
        id
        full_name
        profile_photo
      }
    }
  }
`;