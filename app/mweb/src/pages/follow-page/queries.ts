import { gql } from '@apollo/client';

export type FollowingFeedSource = 'PEOPLE' | 'CLUBS';

export interface FeedAuthor {
  user_id: string;
  full_name?: string | null;
  first_name?: string | null;
  profile_photo?: string | null;
}

export interface FeedPost {
  id: string;
  author_id: string;
  club_id?: string | null;
  image_url: string;
  media_type: 'IMAGE' | 'VIDEO';
  kind: 'POST' | 'STORY';
  caption: string;
  likes_count: number;
  liked_by_me: boolean;
  comments_count: number;
  created_at: string;
  author?: FeedAuthor | null;
}

export interface FeedClub {
  id: string;
  club_id?: string | null;
  club_name: string;
  super_category_id?: string | null;
  club_feature_images_and_videos?: { url: string; type: string }[] | null;
}

/**
 * Posts + still-active stories from the clubs/people the viewer follows,
 * newest first. Comment threads are loaded by the shared PostDialog on open.
 */
export const FOLLOWING_FEED = gql`
  query FollowingFeed($source: FollowingFeedSource!, $limit: Int) {
    followingFeed(source: $source, limit: $limit) {
      id
      author_id
      club_id
      image_url
      media_type
      kind
      caption
      likes_count
      liked_by_me
      comments_count
      created_at
      author {
        user_id
        full_name
        first_name
        profile_photo
      }
    }
  }
`;

/** Lightweight club directory used to resolve club names/links for CLUBS feed cards. */
export const FEED_CLUBS = gql`
  query FollowingFeedClubs {
    superCategories: categories(filter: { level: SUPER }) {
      id
      slug
    }
    clubs {
      id
      club_id
      club_name
      super_category_id
      club_feature_images_and_videos {
        url
        type
      }
    }
  }
`;

export const FOLLOW_ME = gql`
  query FollowingFeedMe {
    me {
      user_id
    }
  }
`;
