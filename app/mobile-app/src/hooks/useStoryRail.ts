import { useMemo } from 'react';

import { useFollowing } from '@/hooks/useFollowing';
import { useStatus, type StatusGroup, type StatusSlide } from '@/hooks/useStatus';

/** Where the viewer's "Open details" button navigates for a rail item. */
export type StoryTarget =
  | { kind: 'club'; id: string; title: string }
  | { kind: 'pod'; id: string; title: string }
  | { kind: 'user'; id: string };

export interface StoryRailItem extends StatusGroup {
  key: string;
  subLabel?: string;
  target?: StoryTarget;
}

type Media = { url?: string | null; type?: string | null };

/** Convert a club/pod media list into viewer slides (drops urlless entries). */
function mediaToSlides(key: string, media: readonly Media[]): StatusSlide[] {
  return media
    .filter((m) => !!m?.url)
    .map((m, index) => ({
      id: `${key}-${index}`,
      imageUrl: m.url,
      mediaType: String(m.type ?? 'IMAGE').toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      caption: null,
      createdAt: '',
      expiresAt: null,
    }));
}

function toGroup(
  key: string,
  name: string,
  slides: StatusSlide[],
  subLabel: string,
  target: StoryTarget,
): StoryRailItem | null {
  const cover = slides[0];
  if (!cover) return null;
  return { key, authorId: key, name, photo: cover.imageUrl, slides, cover, subLabel, target };
}

/**
 * The home story rail's ordered content — the RN mirror of mWeb's HomeStatusRail
 * (bug 3): the viewer's own story first, then followed clubs, followed pods and
 * the people the viewer follows (only their active stories). This replaces the
 * old "everyone's stories" feed so both platforms show the same followed set.
 */
export function useStoryRail() {
  const { statuses, mine, isLoading: statusLoading } = useStatus();
  const { people, followedClubs, followedPods, isLoading: followLoading } = useFollowing();

  const items = useMemo<StoryRailItem[]>(() => {
    const clubItems = followedClubs
      .map((club) =>
        toGroup(
          `club-${club.id}`,
          club.club_name,
          mediaToSlides(`club-${club.id}`, club.club_feature_images_and_videos ?? []),
          'Club status',
          { kind: 'club', id: club.id, title: club.club_name },
        ),
      )
      .filter((item): item is StoryRailItem => item !== null);

    const podItems = followedPods
      .map((pod) =>
        toGroup(
          `pod-${pod.id}`,
          pod.pod_title,
          mediaToSlides(`pod-${pod.id}`, pod.pod_images_and_videos ?? []),
          'Followed pod',
          { kind: 'pod', id: pod.id, title: pod.pod_title },
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

    return [...clubItems, ...podItems, ...userItems];
  }, [statuses, people, followedClubs, followedPods]);

  return { mine, items, isLoading: statusLoading || followLoading };
}
