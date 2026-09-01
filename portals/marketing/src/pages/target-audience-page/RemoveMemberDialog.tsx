import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import { ConfirmDialog, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { REMOVE_AUDIENCE_LIST_MEMBER } from './queries';
import type { AudienceRow } from './helpers';

interface Props {
  listId: string;
  /** The person picked from the Actions column. The page mounts this dialog
   * only while somebody is picked, so nothing here guards a null member. */
  member: AudienceRow;
  onClose: () => void;
  /** Fired after the server has accepted the removal. */
  onRemoved: () => void;
}

/** Whichever handle the account actually has — a phone signup has no name and
 * no email, and a confirmation that names nobody is not a confirmation. */
const memberLabel = (member: AudienceRow) =>
  member.full_name || member.email || member.phone || member.id;

/**
 * Confirm taking one person out of a saved list.
 *
 * The wording says what a removal really does, because a list stores criteria
 * and re-runs them on every read: the person is held out from then on, rather
 * than dropped once and matched straight back in tomorrow.
 */
export default function RemoveMemberDialog({
  listId,
  member,
  onClose,
  onRemoved,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [removeMember, { loading }] = useMutation<any>(REMOVE_AUDIENCE_LIST_MEMBER);

  const confirm = async () => {
    setError(null);
    try {
      await removeMember({ variables: { id: listId, user_id: member.id } });
    } catch (e) {
      setError(parseApiError(e, t('marketing.targetAudience.couldNotRemoveThatPerson')));
      return;
    }
    notifySuccess(t('marketing.targetAudience.removedFromTheList'));
    onClose();
    onRemoved();
  };

  return (
    <ConfirmDialog
      open
      title={t('marketing.targetAudience.removeThisPersonFromTheList')}
      message={
        error ??
        t('marketing.targetAudience.removedPersonStaysOut', {
          vars: { name: memberLabel(member) },
        })
      }
      confirmLabel={t('marketing.targetAudience.remove')}
      confirmColor="error"
      loading={loading}
      busyLabel={t('marketing.targetAudience.removing')}
      onClose={onClose}
      onConfirm={confirm}
    />
  );
}
