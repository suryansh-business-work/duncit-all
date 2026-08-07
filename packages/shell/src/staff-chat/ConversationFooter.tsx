import ChatComposer from './ChatComposer';
import ReplyStrip from './ReplyStrip';
import TypingIndicator from './TypingIndicator';
import type { Coworker, StaffMessage } from './queries';
import type { ChatSettings } from './useChatSettings';

interface Props {
  peer: Coworker;
  sending: boolean;
  uploading: boolean;
  settings: ChatSettings;
  nameOf: (userId: string) => string;
  /** The message being answered, shown above the composer until it is sent. */
  replyTo: StaffMessage | null;
  onCancelReply: () => void;
  /** When this peer last reported typing, or 0. */
  typingAt: number;
  onSend: (text: string) => void;
  onAttach: (file: File) => void;
  onVoiceNote: (file: File, peaks: number[], seconds: number) => void;
  onTyping: () => void;
  onShareLocation: () => void;
}

/**
 * Everything below the thread: who is typing, what is being answered, and the
 * box you write in.
 *
 * One component because the three are a single band at the bottom of the panel
 * and always move together.
 */
export default function ConversationFooter({
  peer,
  sending,
  uploading,
  settings,
  nameOf,
  replyTo,
  onCancelReply,
  typingAt,
  onSend,
  onAttach,
  onVoiceNote,
  onTyping,
  onShareLocation,
}: Readonly<Props>) {
  return (
    <>
      <TypingIndicator at={typingAt} name={peer.name} />

      {replyTo && <ReplyStrip replyTo={replyTo} nameOf={nameOf} onCancel={onCancelReply} />}

      <ChatComposer
        sending={sending}
        uploading={uploading}
        // One name, because a one-to-one thread has one other person in it.
        // The server agrees: any @ in the body mentions them.
        mentionNames={[peer.name]}
        enterToSend={settings.enterToSend}
        onSend={onSend}
        onAttach={onAttach}
        onVoiceNote={onVoiceNote}
        onTyping={onTyping}
        onShareLocation={onShareLocation}
      />
    </>
  );
}
