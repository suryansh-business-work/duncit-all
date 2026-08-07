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
}

/**
 * The two things a conversation opens over itself.
 *
 * Together because neither belongs to the thread's layout, and apart from the
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
}: Readonly<Props>) {
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
    </>
  );
}
