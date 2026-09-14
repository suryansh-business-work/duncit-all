import { useEffect } from 'react';

import { useAuthStore } from '@/stores/auth.store';
import { useMeStore } from '@/stores/me.store';
import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * Loads the user info once per session — mounted once, at the app root.
 *
 * Keyed on the token, so the same effect covers every way a session starts:
 * launch with a stored token, password, OTP and Google sign-in, and both
 * signup doors — none of those screens has to remember to ask. A token that
 * goes away drops the cached user with it, which is what stops a `me: null`
 * left by a refused session (or the last account on this phone) being taken
 * as the answer for the next sign-in.
 */
export function useUserInfoSession(): void {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    const store = useMeStore.getState();
    if (token) {
      fireAndForget(store.refetch());
    } else {
      store.reset();
    }
  }, [token]);
}
