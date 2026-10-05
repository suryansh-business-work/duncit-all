import { useMutation } from '@apollo/client/react';
import { useConfirm } from '@duncit/dialogs';
import { BLOCK_ACTION_COPY, parseApiError, type BlockAction } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { notify } from '../../components/notify';
import { BLOCK_USER, UNBLOCK_USER } from '../../components/content-report/queries';

export interface BlockableProfile {
  user_id: string;
  full_name?: string | null;
  username?: string | null;
  blocked_by_viewer?: boolean | null;
}

/**
 * Block or unblock the member whose profile is open. Native twin:
 * `useProfileBlock` in the app (rule 27).
 *
 * Always asks first — a block cuts every follow between the two at once, and
 * that is not undone by unblocking. The profile is re-read afterwards rather
 * than patched: the server decides what a blocked profile still shows.
 */
export function useProfileBlock(profile: BlockableProfile, onChanged: () => unknown) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const action: BlockAction = profile.blocked_by_viewer ? 'UNBLOCK' : 'BLOCK';
  const copy = BLOCK_ACTION_COPY[action];
  const [run, { loading }] = useMutation(action === 'BLOCK' ? BLOCK_USER : UNBLOCK_USER);
  const name = profile.full_name || (profile.username ? `@${profile.username}` : '');

  const toggle = async () => {
    const agreed = await confirm({
      title: t(copy.confirmTitle, { vars: { name } }),
      message: t(copy.confirmBody),
      confirmLabel: t(copy.menu),
      destructive: action === 'BLOCK',
    });
    if (!agreed) return;
    try {
      await run({ variables: { user_id: profile.user_id } });
      notify(t(copy.done, { vars: { name } }), 'success');
      await onChanged();
    } catch (e) {
      notify(parseApiError(e) || t(copy.failed), 'error');
    }
  };

  return { action, copy, busy: loading, toggle };
}
