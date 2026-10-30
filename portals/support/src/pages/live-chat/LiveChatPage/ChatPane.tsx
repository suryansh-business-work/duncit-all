import { Box, Stack, Typography } from '@mui/material';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import type {
  SupportChatMessage,
  SupportChatSession,
  TranscriptFormat,
} from '../../../graphql/supportChat';
import ChatComposer from '../ChatComposer';
import ChatHeader from './ChatHeader';
import ChatThread from './ChatThread';
import { useTranslation } from '@duncit/shell';

interface Props {
  selected?: SupportChatSession;
  busy: boolean;
  messages: SupportChatMessage[];
  /** The server may hold lines above the oldest one shown. */
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
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
  hasOlder,
  loadingOlder,
  onLoadOlder,
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
  const { t } = useTranslation();
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
          <ChatThread
            // Its own scroll state per chat: a new one opens on its newest line.
            key={selected.id}
            session={selected}
            messages={messages}
            typingLabel={typingLabel}
            hasOlder={hasOlder}
            loadingOlder={loadingOlder}
            onLoadOlder={onLoadOlder}
          />
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
        <Stack spacing={1} sx={{ flex: 1, alignItems: 'center', justifyContent: 'center', color: 'text.secondary', bgcolor: 'background.default' }}>
          <ForumOutlinedIcon sx={{ fontSize: 48, opacity: 0.5 }} aria-hidden />
          <Typography variant="body2">{t('support.chat.selectSession')}</Typography>
        </Stack>
      )}
    </Box>
  );
}
