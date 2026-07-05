import type { FeedClub, FeedPost } from './queries';

export interface FeedCardHeader {
  name: string;
  avatarUrl: string | null;
  /** Router target: club page when the club resolves, else the author's public profile. */
  to: string;
}

/**
 * Resolves what a feed card's clickable header shows: the club (name + cover +
 * club page link) when the post belongs to a resolved club, otherwise the
 * post's author (name + photo + public profile link).
 */
export function getFeedCardHeader(post: FeedPost, club?: FeedClub | null): FeedCardHeader {
  if (club) {
    return {
      name: club.club_name,
      avatarUrl: club.club_feature_images_and_videos?.[0]?.url ?? null,
      to: club.club_id ? `/club/${club.club_id}` : `/u/${post.author_id}`,
    };
  }
  return {
    name: post.author?.full_name ?? post.author?.first_name ?? 'User',
    avatarUrl: post.author?.profile_photo ?? null,
    to: `/u/${post.author_id}`,
  };
}
