import { useCallback, useEffect, useState } from 'react';

const KEY = 'duncit_followed_clubs';

const read = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const write = (ids: string[]) => {
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent('duncit:followed-clubs-changed'));
};

/**
 * Lightweight client-side follow store backed by localStorage.
 * Server-side persistence (followers collection + GraphQL mutations) is a
 * follow-up scope; this hook keeps the UX wired so the rest of the
 * platform can integrate against a stable API today.
 */
export function useFollowedClubs() {
  const [ids, setIds] = useState<string[]>(read);

  useEffect(() => {
    const onChange = () => setIds(read());
    window.addEventListener('duncit:followed-clubs-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('duncit:followed-clubs-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const isFollowing = useCallback(
    (clubId: string) => ids.includes(clubId),
    [ids]
  );

  const follow = useCallback((clubId: string) => {
    const next = Array.from(new Set([...read(), clubId]));
    write(next);
  }, []);

  const unfollow = useCallback((clubId: string) => {
    const next = read().filter((x) => x !== clubId);
    write(next);
  }, []);

  const toggle = useCallback(
    (clubId: string) => (isFollowing(clubId) ? unfollow(clubId) : follow(clubId)),
    [isFollowing, follow, unfollow]
  );

  return { ids, isFollowing, follow, unfollow, toggle };
}
