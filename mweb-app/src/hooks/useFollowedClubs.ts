import { useCallback, useEffect, useMemo, useState } from 'react';

const BASE = 'duncit_followed_clubs';

/**
 * Derive the current user identifier from the JWT in localStorage.
 * Returns 'guest' if no token is present so guest follows do not bleed
 * across signed-in accounts.
 */
function currentUserKey(): string {
  if (typeof window === 'undefined') return 'guest';
  try {
    const token = localStorage.getItem('token');
    if (!token) return 'guest';
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) return 'guest';
    const json = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    return String(json.sub || json.user_id || json.id || 'guest');
  } catch {
    return 'guest';
  }
}

function storageKey() {
  return `${BASE}:${currentUserKey()}`;
}

const read = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const write = (ids: string[]) => {
  localStorage.setItem(storageKey(), JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent('duncit:followed-clubs-changed'));
};

/**
 * Lightweight per-user follow store backed by localStorage. The storage
 * key includes the signed-in user id so each account sees its own
 * follow list. Server-side persistence is a follow-up scope.
 */
export function useFollowedClubs() {
  const [ids, setIds] = useState<string[]>(read);
  // Re-read whenever the active user changes (e.g. logout/login).
  const userKey = useMemo(() => currentUserKey(), []);

  useEffect(() => {
    setIds(read());
    const onChange = () => setIds(read());
    window.addEventListener('duncit:followed-clubs-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('duncit:followed-clubs-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [userKey]);

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
