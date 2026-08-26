import { endSession } from '@/services/session-guard';
import { useMeStore } from '@/stores/me.store';

/**
 * Clears the session — the single logout path shared by the header logout
 * button and the account drawer footer (DRY). Dropping the token flips the
 * navigation gate back to the auth group, so no imperative navigation is needed.
 *
 * The work itself is `endSession`, which is shared with the paths that end a
 * session WITHOUT anybody pressing anything: a token the server has stopped
 * accepting, and the socket frame that says so.
 */
export function useLogout() {
  return async () => {
    await endSession();
    useMeStore.getState().reset();
  };
}
