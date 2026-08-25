import { gql } from '@/generated/graphql';

/**
 * The Following feed — posts from the people (PEOPLE) or clubs (CLUBS) the
 * viewer follows, newest first. Stories are excluded server-side and stay on
 * the story rails. Backs the Following tab's feed; like/comment reuse the
 * profile post viewer's mutations.
 */
export const FollowingFeedDocument = gql(`
  query MobileFollowingFeed($source: FollowingFeedSource!) {
    followingFeed(source: $source) {
      id
      author_id
      club_id
      image_url
      media_type
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
`);
