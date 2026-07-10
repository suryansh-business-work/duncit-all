import { Box, Typography } from '@mui/material';
import type {
  SupportChatMessage,
  SupportChatSession,
  TranscriptFormat,
} from '../../../graphql/supportChat';
import ChatComposer from '../ChatComposer';
import ChatHeader from './ChatHeader';
import ChatThread from './ChatThread';

interface Props {
  selected?: SupportChatSession;
  busy: boolean;
  messages: SupportChatMessage[];
  typingLabel: string | null;
  text: string;
  attachments: string[];
  sending: boolean;
  onResolve: () => void;
  onReopen: () => void;
  onDownload: (format: TranscriptFormat) => void;
  onEmail: (email: string) => void;
  onText: (value: string) => void;
  onAttachments: (urls: string[]) => void;
  onSend: () => void;
  onTyping: () => void;
}

/** The right pane of the live-chat console: header, thread and composer. */
export default function ChatPane({
  selected,
  busy,
  messages,
  typingLabel,
  text,
  attachments,
  sending,
  onResolve,
  onReopen,
  onDownload,
  onEmail,
  onText,
  onAttachments,
  onSend,
  onTyping,
}: Readonly<Props>) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      {selected ? (
        <>
          <ChatHeader
            session={selected}
            busy={busy}
            onResolve={onResolve}
            onReopen={onReopen}
            onDownload={onDownload}
            onEmail={onEmail}
          />
          <ChatThread session={selected} messages={messages} typingLabel={typingLabel} />
          {selected.status !== 'CLOSED' && (
            <ChatComposer
              text={text}
              attachments={attachments}
              sending={sending}
              onText={onText}
              onAttachments={onAttachments}
              onSend={onSend}
              onTyping={onTyping}
            />
          )}
        </>
      ) : (
        <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">Select a session to open the chat.</Typography>
        </Box>
      )}
    </Box>
  );
}
