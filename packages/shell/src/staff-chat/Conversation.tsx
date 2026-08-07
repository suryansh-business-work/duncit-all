import { useMemo, useState } from 'react';
import { Box, LinearProgress } from '@mui/material';
import ChatComposer from './ChatComposer';
import ChatSearchPanel from './ChatSearchPanel';
import ConversationHeader from './ConversationHeader';
import LocationDialog from './LocationDialog';
import MessageThread from './MessageThread';
import ReplyStrip from './ReplyStrip';
import type { Coworker, StaffMessage } from './queries';
import type { ChatFormats, ChatSettings } from './useChatSettings';
import type { PresenceStatus } from './usePresence';

interface Props {
  peer: Coworker;
  meId: string;
  status: PresenceStatus;
  messages: StaffMessage[];
  sending: boolean;
  uploading: boolean;
  onBack: () => void;
  onSend: (text: string) => void;
  onAttach: (file: File) => void;
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  settings: ChatSettings;
  formats: ChatFormats;
  spacing: number;
  nameOf: (userId: string) => string;
  /** The message being answered, shown above the composer until it is sent. */
  replyTo: StaffMessage | null;
  onCancelReply: () => void;
  onLoadMore: () => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string, forEveryone: boolean) => void;
  onReact: (id: string, emoji: string) => void;
  onReply: (message: StaffMessage) => void;
  onForward: (message: StaffMessage) => void;
  onPin: (id: string) => void;
  onNavigate?: (path: string) => void;
  onTyping: () => void;
  onCall: (kind: 'AUDIO' | 'VIDEO') => void;
  onExport: () => void;
  /** Opens portal-to-portal screen sharing with this person. */
  onShareScreen: () => void;
}

export default function Conversation({
  peer,
  meId,
  status,
  messages,
  sending,
  uploading,
  onBack,
  onSend,
  onAttach,
  loading,
  hasMore,
  loadingMore,
  settings,
  formats,
  spacing,
  nameOf,
  replyTo,
  onCancelReply,
  onLoadMore,
  onEdit,
  onDelete,
  onReact,
  onReply,
  onForward,
  onPin,
  onNavigate,
  onTyping,
  onCall,
  onExport,
  onShareScreen,
}: Readonly<Props>) {
  const [locationOpen, setLocationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [jumpToId, setJumpToId] = useState<string | null>(null);

  // What the thread can actually scroll to, so a hit outside it can say so.
  const loadedIds = useMemo(() => new Set(messages.map((message) => message.id)), [messages]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <ConversationHeader
        peer={peer}
        status={status}
        searchOpen={searchOpen}
        onBack={onBack}
        onToggleSearch={() => setSearchOpen((open) => !open)}
        onCall={onCall}
        onShareScreen={onShareScreen}
        onExport={onExport}
      />

      {searchOpen && (
        <ChatSearchPanel
          peerId={peer.id}
          meId={meId}
          peerName={peer.name}
          formats={formats}
          loadedIds={loadedIds}
          onJump={setJumpToId}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {uploading && <LinearProgress />}

      <MessageThread
        jumpToId={jumpToId}
        messages={messages}
        meId={meId}
        loading={loading}
        hasMore={hasMore}
        loadingMore={loadingMore}
        settings={settings}
        formats={formats}
        spacing={spacing}
        nameOf={nameOf}
        onLoadMore={onLoadMore}
        onEdit={onEdit}
        onDelete={onDelete}
        onReact={onReact}
        onReply={onReply}
        onForward={onForward}
        onPin={onPin}
        onNavigate={onNavigate}
      />

      {replyTo && <ReplyStrip replyTo={replyTo} nameOf={nameOf} onCancel={onCancelReply} />}

      <ChatComposer
        sending={sending}
        uploading={uploading}
        enterToSend={settings.enterToSend}
        onSend={onSend}
        onAttach={onAttach}
        onTyping={onTyping}
        onShareLocation={() => setLocationOpen(true)}
      />

      <LocationDialog
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        onSend={(text) => onSend(text)}
      />

    </Box>
  );
}
