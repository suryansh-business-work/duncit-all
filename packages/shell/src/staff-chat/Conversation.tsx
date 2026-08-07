import { useState } from 'react';
import {
  Avatar,
  Box,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import CallIcon from '@mui/icons-material/Call';
import DownloadIcon from '@mui/icons-material/Download';
import SendIcon from '@mui/icons-material/Send';
import VideocamIcon from '@mui/icons-material/Videocam';
import EmojiPicker from './EmojiPicker';
import ChatComposer from './ChatComposer';
import LocationDialog from './LocationDialog';
import MessageThread from './MessageThread';
import PresenceDot from './PresenceDot';
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}
      >
        <IconButton size="small" onClick={onBack} aria-label="Back to coworkers">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <PresenceDot status={status}>
          <Avatar src={peer.photo || undefined} sx={{ width: 30, height: 30 }} />
        </PresenceDot>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" noWrap>
            {peer.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {status.toLowerCase()}
          </Typography>
        </Box>
        <Tooltip title="Audio call">
          <IconButton size="small" onClick={() => onCall('AUDIO')} aria-label="Start audio call">
            <CallIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Video call">
          <IconButton size="small" onClick={() => onCall('VIDEO')} aria-label="Start video call">
            <VideocamIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Share your screen">
          <IconButton size="small" onClick={onShareScreen} aria-label="Share your screen">
            <ScreenShareIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Export this conversation">
          <IconButton size="small" onClick={onExport} aria-label="Export conversation">
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {uploading && <LinearProgress />}

      <MessageThread
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

      {/* What you are answering, until it is sent — a reply with no visible
          target is a message that reads as a non sequitur to its own author. */}
      {replyTo && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ px: 1.5, py: 0.75, borderTop: 1, borderColor: 'divider', bgcolor: 'action.hover' }}
        >
          <Box sx={{ width: 3, alignSelf: 'stretch', bgcolor: 'primary.main', borderRadius: 1 }} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
              Replying to {nameOf(replyTo.from_user_id)}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {replyTo.text || replyTo.attachment_name || 'Attachment'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onCancelReply} aria-label="Cancel reply">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      )}

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
