import { ConfirmDialog } from '@duncit/dialogs';
import { useTranslation } from '../i18n/useTranslation';
import EditHistoryDialog from './EditHistoryDialog';
import LocationDialog from './LocationDialog';
import type { StaffMessage } from './queries';
import type { ChatFormats } from './useChatSettings';

interface Props {
  /** The message whose earlier wordings are being read, if any. */
  historyFor: StaffMessage | null;
  onCloseHistory: () => void;
  locationOpen: boolean;
  onCloseLocation: () => void;
  formats: ChatFormats;
  onSend: (text: string) => void;
  /** Emptying the thread reaches the other person, so it asks first. */
  confirmClear: boolean;
  peerName: string;
  onCancelClear: () => void;
  onConfirmClear: () => void;
}

/**
 * Everything a conversation opens over itself.
 *
 * Together because none of it belongs to the thread's layout, and apart from the
 * conversation because a component that renders a message list has no business
 * also holding the state of a place picker.
 */
export default function ConversationDialogs({
  historyFor,
  onCloseHistory,
  locationOpen,
  onCloseLocation,
  formats,
  onSend,
  confirmClear,
  peerName,
  onCancelClear,
  onConfirmClear,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      {historyFor && (
        <EditHistoryDialog
          open
          messageId={historyFor.id}
          current={historyFor.text}
          formats={formats}
          onClose={onCloseHistory}
        />
      )}

      <LocationDialog open={locationOpen} onClose={onCloseLocation} onSend={onSend} />

      <ConfirmDialog
        open={confirmClear}
        title={t('shell.chat.menu.clearTitle')}
        message={t('shell.chat.menu.clearMessage', { vars: { name: peerName } })}
        confirmLabel={t('shell.chat.menu.clearConfirm')}
        confirmColor="error"
        onCancel={onCancelClear}
        onConfirm={onConfirmClear}
      />
    </>
  );
}
