import { Avatar, Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CallIcon from '@mui/icons-material/Call';
import DownloadIcon from '@mui/icons-material/Download';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import SearchIcon from '@mui/icons-material/Search';
import VideocamIcon from '@mui/icons-material/Videocam';
import PresenceDot from './PresenceDot';
import type { Coworker } from './queries';
import type { PresenceStatus } from './usePresence';

interface Props {
  peer: Coworker;
  status: PresenceStatus;
  searchOpen: boolean;
  onBack: () => void;
  onToggleSearch: () => void;
  onCall: (kind: 'AUDIO' | 'VIDEO') => void;
  onShareScreen: () => void;
  onExport: () => void;
}

/** Who you are talking to, and everything you can start from here. */
export default function ConversationHeader({
  peer,
  status,
  searchOpen,
  onBack,
  onToggleSearch,
  onCall,
  onShareScreen,
  onExport,
}: Readonly<Props>) {
  return (
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
      <Tooltip title="Search this conversation">
        <IconButton
          size="small"
          color={searchOpen ? 'primary' : 'default'}
          onClick={onToggleSearch}
          aria-label="Search this conversation"
          aria-pressed={searchOpen}
        >
          <SearchIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Export this conversation">
        <IconButton size="small" onClick={onExport} aria-label="Export conversation">
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
