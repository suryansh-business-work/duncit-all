import { ConfirmDialog } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import type { Policy } from '../../graphql/policies';

interface Props {
  /** The policy queued for deletion; null keeps that dialog closed. */
  deleteTarget: Policy | null;
  /** The policy queued for a change notice; null keeps that dialog closed. */
  notifyTarget: Policy | null;
  notifying: boolean;
  onDeleteConfirm: () => void;
  onDeleteClose: () => void;
  onNotifyConfirm: () => void;
  onNotifyClose: () => void;
}

/**
 * The two things on this page that cannot be undone, and the sentences that
 * say so before they happen.
 *
 * Both live here rather than on the page because they are the same kind of
 * thing — a confirmation — and keeping them together is what stopped the page
 * from growing past the file ceiling as it gained the second one.
 */
export default function PolicyConfirmDialogs({
  deleteTarget,
  notifyTarget,
  notifying,
  onDeleteConfirm,
  onDeleteClose,
  onNotifyConfirm,
  onNotifyClose,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <>
      <ConfirmDialog
        open={!!deleteTarget}
        title={t('legal.policies.deleteTitle')}
        message={t('legal.policies.deleteMessage', { vars: { title: deleteTarget?.title ?? '' } })}
        confirmLabel={t('shell.common.delete')}
        destructive
        onConfirm={onDeleteConfirm}
        onClose={onDeleteClose}
      />

      <ConfirmDialog
        open={!!notifyTarget}
        title={t('legal.policies.notify.sendTitle')}
        message={t('legal.policies.notify.sendMessage', {
          vars: { title: notifyTarget?.title ?? '' },
        })}
        confirmLabel={t('legal.policies.notify.sendNow')}
        confirmColor="warning"
        loading={notifying}
        onConfirm={onNotifyConfirm}
        onClose={onNotifyClose}
      />
    </>
  );
}
