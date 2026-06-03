import { useAuthStore } from '@/stores/auth.store';
import { useMeStore } from '@/stores/me.store';

/**
 * Clears the session — the single logout path shared by the header logout
 * button and the account drawer footer (DRY). Dropping the token flips the
 * navigation gate back to the auth group, so no imperative navigation is needed.
 */
export function useLogout() {
  const signOut = useAuthStore((s) => s.signOut);

  return async () => {
    await signOut();
    useMeStore.getState().reset();
  };
}
