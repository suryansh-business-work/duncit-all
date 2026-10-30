import { useState } from 'react';
import { BLOCK_ACTION_COPY, parseApiError, type BlockAction } from '@duncit/utils';

import { BlockUserDocument, UnblockUserDocument } from '@/graphql/report';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { useBlockStore } from '@/stores/block.store';
import { useStatusStore } from '@/stores/status.store';
import { fireAndForget } from '@/utils/fire-and-forget';

interface BlockableProfile {
  user_id: string;
  full_name?: string | null;
  username?: string | null;
  blocked_by_viewer?: boolean | null;
}

/**
 * Block or unblock the member whose profile is open. mWeb twin:
 * `useProfileBlock` (rule 27).
 *
 * The confirm dialog stays open and spins until the server answers, so the
 * press has a visible result; a failure is said in the screen, not swallowed.
 * The profile is re-read afterwards — the server decides what a blocked
 * profile still shows.
 */
export function useProfileBlock(profile: BlockableProfile | null, reload: () => Promise<unknown>) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const action: BlockAction = profile?.blocked_by_viewer ? 'UNBLOCK' : 'BLOCK';
  const copy = BLOCK_ACTION_COPY[action];
  const name = profile?.full_name || (profile?.username ? `@${profile.username}` : '');

  const confirm = async () => {
    if (!profile || busy) return;
    setBusy(true);
    setError('');
    try {
      await graphqlRequest(
        action === 'BLOCK' ? BlockUserDocument : UnblockUserDocument,
        { user_id: profile.user_id },
        { auth: true },
      );
      // The server now leaves this member out of every feed: the open feeds
      // and the story rail re-read, so their posts are gone at once.
      useBlockStore.getState().bump();
      fireAndForget(useStatusStore.getState().fetch(true));
      await reload();
      setConfirming(false);
    } catch (e) {
      setError(parseApiError(e) || t(copy.failed));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return {
    action,
    copy,
    name,
    busy,
    error,
    confirming,
    ask: () => setConfirming(true),
    cancel: () => setConfirming(false),
    confirm,
  };
}
