import { useCallback, useMemo, useState } from 'react';
import { Box, LinearProgress } from '@mui/material';
import ChatComposer from './ChatComposer';
import ChatSearchPanel from './ChatSearchPanel';
import ConversationHeader from './ConversationHeader';
import ConversationDialogs from './ConversationDialogs';
import MessageThread from './MessageThread';
import ReplyStrip from './ReplyStrip';
import SelectionBar from './SelectionBar';
import { useMessageSelection } from './useMessageSelection';
import { useSearchShortcut } from './useSearchShortcut';
import TypingIndicator from './TypingIndicator';
import type { Coworker, StaffCall, StaffMessage } from './queries';
import type { ThreadEntryHandlers } from './ThreadEntry';
import type { ChatFormats, ChatSettings } from './useChatSettings';
import type { PresenceStatus } from './usePresence';

/** What the thread does to one message. Conversation only forwards these. */
export type ConversationHandlers = Pick<
  ThreadEntryHandlers,
  'onEdit' | 'onDelete' | 'onReact' | 'onReply' | 'onForward' | 'onPin' | 'onNavigate'
> & {
  /** Send a failed message again. */
  onRetry: (message: StaffMessage) => void;
};

interface Props {
  peer: Coworker;
  meId: string;
  status: PresenceStatus;
  /** When they were last connected, for the header line. */
  lastSeen: string | null;
  messages: StaffMessage[];
  /** Calls on this line, merged into the thread by time. */
  calls: StaffCall[];
  onPlayRecording: (url: string) => void;
  sending: boolean;
  uploading: boolean;
  /** 0-100 while a file is going up, null when nothing is. */
  uploadPct: number | null;
  onBack: () => void;
  onSend: (text: string) => void;
  onAttach: (file: File) => void;
  onVoiceNote: (file: File, peaks: number[], seconds: number) => void;
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
  /** Everything the thread does to one message — forwarded straight through. */
  handlers: ConversationHandlers;
  /** True when this reader may see earlier wordings — SUPER_ADMIN only. */
  canSeeEditHistory: boolean;
  onTyping: () => void;
  /** When this peer last reported typing, or 0. */
  typingAt: number;
  onCall: (kind: 'AUDIO' | 'VIDEO') => void;
  onExport: () => void;
}

export default function Conversation({
  peer,
  meId,
  status,
  lastSeen,
  messages,
  calls,
  onPlayRecording,
  sending,
  uploading,
  uploadPct,
  onBack,
  onSend,
  onAttach,
  onVoiceNote,
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
  handlers,
  canSeeEditHistory,
  onTyping,
  typingAt,
  onCall,
  onExport,
}: Readonly<Props>) {
  const [locationOpen, setLocationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [jumpToId, setJumpToId] = useState<string | null>(null);
  /** The message whose earlier wordings are being read, if any. */
  const [historyFor, setHistoryFor] = useState<StaffMessage | null>(null);
  const selection = useMessageSelection({ messages, meId, nameOf, onDelete: handlers.onDelete });

  // What the thread can actually scroll to, so a hit outside it can say so.
  const loadedIds = useMemo(() => new Set(messages.map((message) => message.id)), [messages]);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const progressVariant = uploadPct === null ? 'indeterminate' : 'determinate';

  useSearchShortcut(openSearch, closeSearch);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {selection.active ? (
        <SelectionBar selection={selection} />
      ) : (
        <ConversationHeader
          peer={peer}
          status={status}
          lastSeen={lastSeen}
          searchOpen={searchOpen}
          onBack={onBack}
          onToggleSearch={() => setSearchOpen((open) => !open)}
          onCall={onCall}
          onExport={onExport}
        />
      )}

      {searchOpen && (
        <ChatSearchPanel
          peerId={peer.id}
          meId={meId}
          peerName={peer.name}
          formats={formats}
          loadedIds={loadedIds}
          onJump={setJumpToId}
          onClose={closeSearch}
        />
      )}

      {/* A real percentage where there is one: "is this moving or stuck" is
          the question an indeterminate bar cannot answer. */}
      {uploading && <LinearProgress variant={progressVariant} value={uploadPct ?? 0} />}

      <MessageThread
        jumpToId={jumpToId}
        messages={messages}
        calls={calls}
        onPlayRecording={onPlayRecording}
        selectedIds={selection.ids}
        // Only while the mode is on — see useMessageSelection.
        onSelect={selection.active ? selection.toggle : undefined}
        onStartSelect={selection.start}
        meId={meId}
        loading={loading}
        hasMore={hasMore}
        loadingMore={loadingMore}
        settings={settings}
        formats={formats}
        spacing={spacing}
        nameOf={nameOf}
        onLoadMore={onLoadMore}
        onEditHistory={canSeeEditHistory ? setHistoryFor : undefined}
        {...handlers}
      />

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
        onShareLocation={() => setLocationOpen(true)}
      />

      <ConversationDialogs
        historyFor={historyFor}
        onCloseHistory={() => setHistoryFor(null)}
        locationOpen={locationOpen}
        onCloseLocation={() => setLocationOpen(false)}
        formats={formats}
        onSend={onSend}
      />
    </Box>
  );
}
