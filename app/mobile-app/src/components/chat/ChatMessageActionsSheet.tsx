import { ActionRow } from '@/components/host-manage/ActionRow';
import { RowGroup } from '@/components/host-manage/RowGroup';
import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

export interface MessageActionsTarget {
  id: string;
  mine: boolean;
  /**
   * What the thread itself allows on this line — a venue chat's
   * `venueChatLineActions`. Absent: a group room's rules (react to any line,
   * delete your own or, as its moderator, anyone's).
   */
  allowed?: { react: boolean; edit: boolean; remove: boolean };
}

interface Props {
  target: MessageActionsTarget | null;
  /** The viewer runs this room (a club admin, a pod host). */
  canModerate: boolean;
  onClose: () => void;
  onReact: (id: string) => void;
  /** Answer the message (quoted over the composer). Absent in a closed room. */
  onReply?: (id: string) => void;
  /** Rewrite the message — offered only where the target allows it. */
  onEdit?: (id: string) => void;
  onDelete: (id: string) => void;
  /** Report someone else's message. Absent where there is nothing to report to. */
  onReport?: (id: string) => void;
}

/**
 * What can be done to one message, opened by a long press: react, reply, edit
 * (where the thread allows it), delete (your own, or anyone's in a room you
 * moderate) and report (anyone's but your own). The server is the gate — this
 * only decides what is offered. The Tamagui twin of mWeb's MessageActionsMenu
 * (rule 27).
 */
export function ChatMessageActionsSheet({
  target,
  canModerate,
  onClose,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onReport,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink, danger } = useThemeColors();
  const pick = (run: (id: string) => void) => () => {
    if (target) run(target.id);
    onClose();
  };
  const allowed = target?.allowed;
  const canDelete = !!target && (allowed ? allowed.remove : target.mine || canModerate);
  return (
    <DuncitDialog
      open={!!target}
      onClose={onClose}
      testID="chat-message-actions"
      title={t('mweb.chatRoom.messageActions')}
      closeLabel={t('mweb.hostPodActions.close')}
    >
      <RowGroup>
        {!allowed || allowed.react ? (
          <ActionRow
            testID="chat-message-action-react"
            icon="add-reaction"
            label={t('mweb.chatRoom.react')}
            tint={ink}
            onPress={pick(onReact)}
          />
        ) : null}
        {onReply ? (
          <ActionRow
            testID="chat-message-action-reply"
            icon="reply"
            label={t('mweb.chatRoom.reply.action')}
            tint={ink}
            onPress={pick(onReply)}
          />
        ) : null}
        {onEdit && allowed?.edit ? (
          <ActionRow
            testID="chat-message-action-edit"
            icon="edit"
            label={t('mweb.chatRoom.editMessage')}
            tint={ink}
            onPress={pick(onEdit)}
          />
        ) : null}
        {canDelete ? (
          <ActionRow
            testID="chat-message-action-delete"
            icon="delete-outline"
            label={t('mweb.chatRoom.deleteMessage')}
            tint={danger}
            danger
            onPress={pick(onDelete)}
          />
        ) : null}
        {onReport && target && !target.mine ? (
          <ActionRow
            testID="chat-message-action-report"
            icon="outlined-flag"
            label={t('mweb.chatRoom.reportMessage')}
            tint={ink}
            onPress={pick(onReport)}
          />
        ) : null}
      </RowGroup>
    </DuncitDialog>
  );
}
