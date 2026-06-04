import { useEffect, useMemo } from 'react';

import { useStatusStore, type StatusFeed } from '@/stores/status.store';

export type StatusPost = StatusFeed['posts'][number];

export interface StatusGroup {
  authorId: string;
  name: string;
  photo?: string | null;
  latest: StatusPost;
}

const newestFirst = (a: { created_at: string }, b: { created_at: string }) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

/** One entry per author, holding their most recent status. */
function groupByAuthor(posts: StatusPost[]): StatusGroup[] {
  const byAuthor = new Map<string, StatusGroup>();
  posts.forEach((post) => {
    const current = byAuthor.get(post.author_id);
    if (!current || newestFirst(post, current.latest) < 0) {
      byAuthor.set(post.author_id, {
        authorId: post.author_id,
        name: post.author?.full_name ?? 'User',
        photo: post.author?.profile_photo,
        latest: post,
      });
    }
  });
  return [...byAuthor.values()];
}

/** Loads the status feed and returns others' statuses (grouped) + my latest. */
export function useStatus() {
  const data = useStatusStore((s) => s.data);
  const isLoading = useStatusStore((s) => s.isLoading);
  const fetch = useStatusStore((s) => s.fetch);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const statuses = useMemo(() => groupByAuthor(data?.posts ?? []), [data?.posts]);
  const myLatest = useMemo(
    () => (data?.myPosts ?? []).slice().sort(newestFirst)[0],
    [data?.myPosts],
  );

  return { statuses, myLatest, isLoading, refetch: () => fetch(true) };
}
