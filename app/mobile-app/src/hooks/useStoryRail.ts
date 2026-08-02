import { useMemo } from 'react';

import { useFollowing } from '@/hooks/useFollowing';
import { useStatus, type StatusGroup, type StatusPost, type StatusSlide } from '@/hooks/useStatus';

/** A story row carrying the club it was posted to. */
type ClubStoryPost = StatusPost;

/** Where the viewer's "Open details" button navigates for a rail item. Clubs carry
 * their URL slug (clubSlug) so the deep link matches mWeb's /club/:clubSlug. */
export type StoryTarget =
  | { kind: 'club'; id: string; clubSlug: string; title: string }
  | { kind: 'user'; id: string };

export interface StoryRailItem extends StatusGroup {
  key: string;
  subLabel?: string;
  target?: StoryTarget;
}

/** Convert a club's LIVE stories into viewer slides, oldest → newest. */
function clubStoriesToSlides(stories: readonly ClubStoryPost[]): StatusSlide[] {
  return stories
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((story) => ({
      id: story.id,
      imageUrl: story.image_url,
      mediaType: String(story.media_type ?? 'IMAGE').toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      caption: story.caption ?? null,
      createdAt: story.created_at,
      expiresAt: story.expires_at,
      seenByMe: story.seen_by_me ?? false,
      likedByMe: story.liked_by_me ?? false,
      likesCount: story.likes_count ?? 0,
    }));
}

function toGroup(
  key: string,
  name: string,
  slides: StatusSlide[],
  subLabel: string,
  target: StoryTarget,
): StoryRailItem | null {
  // Slides play oldest → newest, but the ring shows the NEWEST story, matching
  // groupByAuthor and both club surfaces.
  const cover = slides.at(-1);
  if (!cover) return null;
  return { key, authorId: key, name, photo: cover.imageUrl, slides, cover, subLabel, target };
}

/**
 * The home story rail's ordered content — the RN mirror of mWeb's HomeStatusRail
 * (bug 3): the viewer's own story first, then followed clubs and the people the
 * viewer follows (only their active stories). This replaces the old "everyone's
 * stories" feed so both platforms show the same followed set.
 */
export function useStoryRail() {
  const { statuses, clubStories, mine, isLoading: statusLoading } = useStatus();
  const { people, followedClubs, isLoading: followLoading } = useFollowing();

  const items = useMemo<StoryRailItem[]>(() => {
    // A club ring is built from that club's LIVE 24h stories. It used to render
    // the club's permanent feature gallery, which has no expiry — those rings
    // sat in the rail forever looking exactly like a real story.
    const clubItems = followedClubs
      .map((club) =>
        toGroup(
          `club-${club.id}`,
          club.club_name,
          clubStoriesToSlides(clubStories.filter((story) => story.club_id === club.id)),
          'Club status',
          { kind: 'club', id: club.id, clubSlug: club.club_id, title: club.club_name },
        ),
      )
      .filter((item): item is StoryRailItem => item !== null);

    // Followed people who actually have an active story (grouped by useStatus).
    const followedUserIds = new Set(people.map((person) => person.user_id));
    const storiesByAuthor = new Map(statuses.map((group) => [group.authorId, group]));
    const userItems = people.flatMap((person) => {
      const group = storiesByAuthor.get(person.user_id);
      if (!group || !followedUserIds.has(person.user_id)) return [];
      return [
        {
          ...group,
          key: `user-${person.user_id}`,
          name: person.first_name || person.full_name || group.name,
          photo: person.profile_photo ?? group.photo,
          subLabel: person.full_name ?? undefined,
          target: { kind: 'user', id: person.user_id } as StoryTarget,
        },
      ];
    });

    return [...clubItems, ...userItems];
  }, [statuses, clubStories, people, followedClubs]);

  return { mine, items, isLoading: statusLoading || followLoading };
}
