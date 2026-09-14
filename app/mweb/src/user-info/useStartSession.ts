import { useCallback, useState } from 'react';
import { useUserData } from '@duncit/user-context';

/**
 * Sign-in and sign-up both end here: store the token, then load USER_INFO once
 * before the app is shown.
 *
 * Loading it BEFORE navigating is what lets every screen behind the login read
 * the cache instead of asking — and it replaces whatever a signed-out read left
 * there (a `me: null` from the tour provider), which a cache-first reader
 * would otherwise have taken as the answer. It goes through the provider's own
 * refetch, so the shell's user, the socket and the cache all start together.
 */
export function useStartSession() {
  const { refetch } = useUserData();
  const [starting, setStarting] = useState(false);

  const start = useCallback(
    async (token: string) => {
      localStorage.setItem('token', token);
      setStarting(true);
      try {
        await refetch();
      } finally {
        setStarting(false);
      }
    },
    [refetch],
  );

  return { start, starting };
}
