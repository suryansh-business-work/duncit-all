import { ActionRow } from '@/components/host-manage/ActionRow';
import { RowGroup } from '@/components/host-manage/RowGroup';
import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

export interface MessageActionsTarget {
  id: string;
  mine: boolean;
}

interface Props {
  target: MessageActionsTarget | null;
  /** The viewer runs this room (a club admin, a pod host). */
  canModerate: boolean;
  onClose: () => void;
  onReact: (id: string) => void;
  /** Answer the message (quoted over the composer). Absent in a closed room. */
  onReply?: (id: string) => void;
  onDelete: (id: string) => void;
  onReport: (id: string) => void;
}

/**
 * What can be done to one message, opened by a long press: react, reply, delete
 * (your own, or anyone's in a room you moderate) and report (anyone's but your
 * own). The server is the gate — this only decides what is offered. The
 * Tamagui twin of mWeb's MessageActionsMenu (rule 27).
 */
export function ChatMessageActionsSheet({
  target,
  canModerate,
  onClose,
  onReact,
  onReply,
  onDelete,
  onReport,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink, danger } = useThemeColors();
  const pick = (run: (id: string) => void) => () => {
    if (target) run(target.id);
    onClose();
  };
  return (
    <DuncitDialog
      open={!!target}
      onClose={onClose}
      testID="chat-message-actions"
      title={t('mweb.chatRoom.messageActions')}
      closeLabel={t('mweb.hostPodActions.close')}
    >
      <RowGroup>
        <ActionRow
          testID="chat-message-action-react"
          icon="add-reaction"
          label={t('mweb.chatRoom.react')}
          tint={ink}
          onPress={pick(onReact)}
        />
        {onReply ? (
          <ActionRow
            testID="chat-message-action-reply"
            icon="reply"
            label={t('mweb.chatRoom.reply.action')}
            tint={ink}
            onPress={pick(onReply)}
          />
        ) : null}
        {target && (target.mine || canModerate) ? (
          <ActionRow
            testID="chat-message-action-delete"
            icon="delete-outline"
            label={t('mweb.chatRoom.deleteMessage')}
            tint={danger}
            danger
            onPress={pick(onDelete)}
          />
        ) : null}
        {target && !target.mine ? (
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
