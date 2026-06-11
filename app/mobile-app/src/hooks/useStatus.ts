import { useEffect, useMemo } from 'react';

import { useStatusStore, type StatusFeed } from '@/stores/status.store';

export type StatusPost = StatusFeed['stories'][number];

export interface StatusSlide {
  id: string;
  imageUrl?: string | null;
  mediaType: string;
  caption?: string | null;
  createdAt: string;
}

export interface StatusGroup {
  authorId: string;
  name: string;
  photo?: string | null;
  /** All of the author's active stories, oldest → newest, shown as add-on slides. */
  slides: StatusSlide[];
  /** Newest slide — drives the rail tile thumbnail. */
  cover: StatusSlide;
}

const oldestFirst = (a: { created_at: string }, b: { created_at: string }) =>
  new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

const toSlide = (post: StatusPost): StatusSlide => ({
  id: post.id,
  imageUrl: post.image_url,
  mediaType: post.media_type ?? 'IMAGE',
  caption: post.caption,
  createdAt: post.created_at,
});

/** Build one group per author, keeping every story as a chronological slide. */
function groupByAuthor(
  posts: StatusPost[],
  meta?: (post: StatusPost) => { name: string; photo?: string | null },
): StatusGroup[] {
  const byAuthor = new Map<string, StatusPost[]>();
  posts.forEach((post) => {
    const list = byAuthor.get(post.author_id) ?? [];
    list.push(post);
    byAuthor.set(post.author_id, list);
  });
  return [...byAuthor.entries()].flatMap(([authorId, list]) => {
    const head = list[0];
    const slides = list.slice().sort(oldestFirst).map(toSlide);
    const cover = slides[slides.length - 1];
    /* istanbul ignore next -- defensive: a map entry always has at least one post */
    if (!head || !cover) return [];
    const info = meta?.(head) ?? { name: 'User', photo: null };
    return [{ authorId, name: info.name, photo: info.photo, slides, cover }];
  });
}

/** Loads the status feed and returns others' stories (grouped) + my own group. */
export function useStatus() {
  const data = useStatusStore((s) => s.data);
  const isLoading = useStatusStore((s) => s.isLoading);
  const fetch = useStatusStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const statuses = useMemo(
    () =>
      groupByAuthor(data?.stories ?? [], (post) => ({
        name: post.author?.full_name ?? 'User',
        photo: post.author?.profile_photo,
      })),
    [data?.stories],
  );

  const mine = useMemo(() => groupByAuthor(data?.myStories ?? [])[0] ?? null, [data?.myStories]);

  return { statuses, mine, isLoading, refetch: () => fetch(true) };
}
