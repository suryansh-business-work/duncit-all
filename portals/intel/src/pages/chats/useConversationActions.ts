import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@apollo/client/react';
import type { IntelConversation } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { fireAndForget } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';
import { INTEL_COUNTS, INTEL_DELETE_CONVERSATION, INTEL_UPDATE_CONVERSATION } from '../../graphql/chat';
import { intelLog } from '../../lib/logger';
import type { RowAction } from './ConversationRow';

/** Rename, pin, archive/restore and delete for the history list — every one scoped to the caller by the server. */
export function useConversationActions(refetch: () => void) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState<IntelConversation | null>(null);
  const [deleting, setDeleting] = useState<IntelConversation | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [update, { loading: saving }] = useMutation(INTEL_UPDATE_CONVERSATION, { refetchQueries: [INTEL_COUNTS] });
  const [remove, { loading: removing }] = useMutation(INTEL_DELETE_CONVERSATION, { refetchQueries: [INTEL_COUNTS] });

  const patch = async (c: IntelConversation, values: Record<string, unknown>, done: string) => {
    try {
      await update({ variables: { id: c.id, patch: values } });
      notifySuccess(done);
      refetch();
    } catch (err) {
      notifyError(parseApiError(err, t('intel.chats.actionFailed')));
    }
  };

  const onAction = (action: RowAction, c: IntelConversation) => {
    if (action === 'open') navigate(`/c/${c.id}`);
    if (action === 'rename') {
      setRenameError(null);
      setRenaming(c);
    }
    if (action === 'pin') fireAndForget(patch(c, { pinned: !c.pinned }, c.pinned ? t('intel.chats.unpinned') : t('intel.chats.pinnedDone')), intelLog, '/chats', 'pin');
    if (action === 'archive') fireAndForget(patch(c, { archived: !c.archived }, c.archived ? t('intel.chats.restored') : t('intel.chats.archived')), intelLog, '/chats', 'archive');
    if (action === 'delete') setDeleting(c);
  };

  const rename = async (title: string) => {
    if (!renaming) return;
    try {
      await update({ variables: { id: renaming.id, patch: { title } } });
      setRenaming(null);
      refetch();
    } catch (err) {
      setRenameError(parseApiError(err, t('intel.chats.actionFailed')));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove({ variables: { id: deleting.id } });
      notifySuccess(t('intel.chats.deleted'));
      setDeleting(null);
      refetch();
    } catch (err) {
      notifyError(parseApiError(err, t('intel.chats.actionFailed')));
    }
  };

  return { onAction, renaming, setRenaming, renameError, rename, saving, deleting, setDeleting, confirmDelete, removing };
}
