import { Box } from '@mui/material';
import Conversation from './Conversation';
import CoworkerList from './CoworkerList';
import type { Coworker, StaffMessage } from './queries';
import type { ChatFormats, ChatSettings } from './useChatSettings';
import type { useStaffChatData } from './useStaffChatData';

interface Props {
  data: ReturnType<typeof useStaffChatData>;
  meId: string;
  /** Whose conversation is open, or null for the directory. */
  peer: Coworker | null;
  onOpenPeer: (peer: Coworker | null) => void;
  search: string;
  onSearch: (value: string) => void;
  role: string;
  onRole: (value: string) => void;
  settings: ChatSettings;
  formats: ChatFormats;
  spacing: number;
  replyTo: StaffMessage | null;
  onReplyTo: (message: StaffMessage | null) => void;
  onCall: (kind: 'AUDIO' | 'VIDEO') => void;
  onPlayRecording: (url: string) => void;
  /** SUPER_ADMIN may read earlier wordings of an edited message. */
  canSeeEditHistory: boolean;
}

/**
 * The panel's middle: one conversation, or the list of people to have one with.
 *
 * Split from the panel because wiring a conversation to the data layer is
 * thirty props of plumbing, and that plumbing has nothing to say about whether
 * the sidebar is open or where the call window sits.
 */
export default function ChatBody({
  data,
  meId,
  peer,
  onOpenPeer,
  search,
  onSearch,
  role,
  onRole,
  settings,
  formats,
  spacing,
  replyTo,
  onReplyTo,
  onCall,
  onPlayRecording,
  canSeeEditHistory,
}: Readonly<Props>) {
  const { change, mutations } = data;

  return (
    <Box sx={{ flex: 1, minHeight: 0 }}>
      {peer ? (
        <Conversation
          peer={peer}
          meId={meId}
          status={data.statusOf(peer.id)}
          lastSeen={data.lastSeenOf(peer.id)}
          messages={data.visibleMessages}
          calls={data.calls}
          onPlayRecording={onPlayRecording}
          sending={data.sending}
          uploading={data.uploading}
          uploadPct={data.uploadPct}
          onBack={() => onOpenPeer(null)}
          onSend={data.send}
          onAttach={(file) => data.attachFile(file)}
          onVoiceNote={(file, peaks) => data.attachFile(file, peaks)}
          handlers={{
            onEdit: (id, text) => change(mutations.editMessage, { id, text }),
            onDelete: (id, forEveryone) => {
              if (forEveryone) {
                change(mutations.deleteMessage, { id });
                return;
              }
              data.hideForMe(id);
            },
            onReact: (id, emoji) => change(mutations.reactToMessage, { id, emoji }),
            onReply: onReplyTo,
            // One-to-one threads: forwarding goes to whoever you open next, so
            // it lands as a normal message in that conversation.
            onForward: (message) =>
              change(mutations.forwardMessage, { id: message.id, toUserId: peer.id }),
            onPin: (id) => change(mutations.pinMessage, { id }),
            onRetry: data.retry,
          }}
          onCancelReply={() => onReplyTo(null)}
          replyTo={replyTo}
          canSeeEditHistory={canSeeEditHistory}
          loading={data.messagesLoading}
          hasMore={data.hasMore}
          loadingMore={data.loadingMore}
          onLoadMore={data.loadOlder}
          settings={settings}
          formats={formats}
          spacing={spacing}
          nameOf={data.nameOf}
          onTyping={() => data.typing(peer.id)}
          typingAt={data.typingAt[peer.id] ?? 0}
          onCall={onCall}
          onExport={() => data.exportChat().catch(() => undefined)}
        />
      ) : (
        <CoworkerList
          search={search}
          onSearch={onSearch}
          role={role}
          onRole={onRole}
          threads={data.threads}
          coworkers={data.coworkers}
          statusOf={data.statusOf}
          onOpen={onOpenPeer}
        />
      )}
    </Box>
  );
}
