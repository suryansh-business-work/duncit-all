import { Avatar, Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CallIcon from '@mui/icons-material/Call';
import SearchIcon from '@mui/icons-material/Search';
import VideocamIcon from '@mui/icons-material/Videocam';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from '../i18n/useTranslation';
import ConversationMenu from './ConversationMenu';
import PresenceDot from './PresenceDot';
import type { Coworker } from './queries';
import type { PresenceStatus } from './usePresence';

interface Props {
  peer: Coworker;
  status: PresenceStatus;
  /** When they were last connected. Only meaningful once they are offline. */
  lastSeen: string | null;
  searchOpen: boolean;
  onBack: () => void;
  onToggleSearch: () => void;
  onCall: (kind: 'AUDIO' | 'VIDEO') => void;
  onExport: () => void;
  onClear: () => void;
  onSettings: () => void;
}

/**
 * "online", or when they were last here.
 *
 * A bare "offline" answers the wrong question. What a person about to type
 * wants to know is whether it is worth waiting for a reply, and that is a
 * TIME — five minutes ago and yesterday afternoon call for different messages.
 */
function presenceLine(
  status: PresenceStatus,
  lastSeen: string | null,
  t: (key: string, options?: { vars?: Record<string, string> }) => string
): string {
  if (status === 'ONLINE') return t('shell.chat.presence.online');
  if (status === 'AWAY') return t('shell.chat.presence.away');
  if (status === 'BUSY') return t('shell.chat.presence.busy');
  if (!lastSeen) return t('shell.chat.header.offline');
  // The server holds last-seen in memory, so a restart loses it and this
  // falls back to the plain word rather than inventing a time.
  const when = formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
  return t('shell.chat.header.lastSeen', { vars: { when } });
}

/** Who you are talking to, and everything you can start from here. */
export default function ConversationHeader({
  peer,
  status,
  lastSeen,
  searchOpen,
  onBack,
  onToggleSearch,
  onCall,
  onExport,
  onClear,
  onSettings,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        p: 1,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
      <IconButton size="small" onClick={onBack} aria-label={t('shell.chat.header.back')}>
        <ArrowBackIcon fontSize="small" />
      </IconButton>
      <PresenceDot status={status}>
        <Avatar src={peer.photo || undefined} sx={{ width: 30, height: 30 }} />
      </PresenceDot>
      {/* The only part that may shrink. `noWrap` alone was not enough: with the
          buttons free to shrink too, flexbox took the width out of THEM, and a
          long "last seen …" ran under the call icons instead of ellipsing. */}
      <Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
        <Typography variant="subtitle2" noWrap>
          {peer.name}
        </Typography>
        <Typography variant="caption" noWrap component="div" sx={{
          color: "text.secondary"
        }}>
          {presenceLine(status, lastSeen, t)}
        </Typography>
      </Box>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          flexShrink: 0
        }}>
        <Tooltip title={t('shell.chat.header.audioCall')}>
          <IconButton
            size="small"
            onClick={() => onCall('AUDIO')}
            aria-label={t('shell.chat.header.startAudio')}
          >
            <CallIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('shell.chat.header.videoCall')}>
          <IconButton
            size="small"
            onClick={() => onCall('VIDEO')}
            aria-label={t('shell.chat.header.startVideo')}
          >
            <VideocamIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('shell.chat.header.searchHint')}>
          <IconButton
            size="small"
            color={searchOpen ? 'primary' : 'default'}
            onClick={onToggleSearch}
            aria-label={t('shell.chat.header.search')}
            aria-pressed={searchOpen}
          >
            <SearchIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <ConversationMenu onExport={onExport} onClear={onClear} onSettings={onSettings} />
      </Stack>
    </Stack>
  );
}
