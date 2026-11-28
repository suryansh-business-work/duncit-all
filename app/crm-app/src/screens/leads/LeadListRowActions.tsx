import { ActionSheet } from '@/components/ActionSheet';
import type { LeadListRow as Row } from '@/features/leads-list/listKinds';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The lead whose ⋯ was pressed; null keeps the sheet closed. */
  row: Row | null;
  onOpen: (row: Row) => void;
  onEdit: (row: Row) => void;
  onLogNote: (row: Row) => void;
  onFollowUp: (row: Row) => void;
  onDelete: (row: Row) => void;
  onClose: () => void;
}

/**
 * A listed lead's actions in one bottom sheet: open it, edit it, log a note,
 * schedule a follow-up, or delete it (which still asks to confirm).
 */
export function LeadListRowActions({
  row,
  onOpen,
  onEdit,
  onLogNote,
  onFollowUp,
  onDelete,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const act = (fn: (r: Row) => void) => () => {
    if (row) fn(row);
  };
  return (
    <ActionSheet
      open={row !== null}
      title={row?.name ?? ''}
      actions={[
        {
          key: 'open',
          label: t('crmApp.mobile.openLead'),
          icon: 'open-in-new',
          onPress: act(onOpen),
        },
        { key: 'edit', label: t('shell.common.edit'), icon: 'edit', onPress: act(onEdit) },
        { key: 'note', label: t('crmApp.lead.addNote'), icon: 'note-add', onPress: act(onLogNote) },
        {
          key: 'follow-up',
          label: t('crmApp.lead.addReminder'),
          icon: 'alarm-add',
          onPress: act(onFollowUp),
        },
        {
          key: 'delete',
          label: t('shell.common.delete'),
          icon: 'delete-outline',
          destructive: true,
          onPress: act(onDelete),
        },
      ]}
      onClose={onClose}
      testID="lead-list-actions"
    />
  );
}
