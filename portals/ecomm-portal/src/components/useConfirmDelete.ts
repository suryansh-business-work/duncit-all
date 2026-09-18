import { useCallback } from 'react';
import { useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';

/**
 * Ask before deleting something, naming it. Red, focus lands on Cancel, and
 * the answer is a plain boolean — Cancel, backdrop and Escape are all "no".
 */
export function useConfirmDelete() {
  const confirm = useConfirm();
  const { t } = useTranslation();
  return useCallback(
    (name: string, message?: string) =>
      confirm({
        title: t('ecommPortal.common.deleteTitle', { vars: { name } }),
        message: message ?? t('ecommPortal.common.deleteMessage'),
        destructive: true,
        confirmLabel: t('shell.common.delete'),
        cancelLabel: t('shell.common.cancel'),
      }),
    [confirm, t],
  );
}
