import { Box, Chip, Link, Stack, Tooltip, Typography } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import CallMissedIcon from '@mui/icons-material/CallMissed';
import VideocamIcon from '@mui/icons-material/Videocam';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';
import { callDuration } from './timeline';
import type { StaffCall } from './queries';
import type { ChatFormats } from './useChatSettings';

interface Props {
  call: StaffCall;
  meId: string;
  formats: ChatFormats;
  /** Opens the recording in the lightbox rather than a new tab. */
  onPlay: (url: string) => void;
}

/**
 * Direction and kind to key.
 *
 * Spelled out rather than built from pieces: a template-built key is invisible
 * both to the shipped-key verifier and to anyone grepping for where a string
 * is rendered.
 */
const KIND_KEY = {
  out: {
    audio: 'shell.chat.callRow.outgoingAudio',
    video: 'shell.chat.callRow.outgoingVideo',
  },
  in: {
    audio: 'shell.chat.callRow.incomingAudio',
    video: 'shell.chat.callRow.incomingVideo',
  },
} as const;

/** Outcome to key. ANSWERED adds nothing — the duration already says it. */
const OUTCOME_KEY: Record<StaffCall['outcome'], string> = {
  ANSWERED: '',
  MISSED: 'shell.chat.callRow.missed',
  DECLINED: 'shell.chat.callRow.declined',
  CANCELLED: 'shell.chat.callRow.cancelled',
};

/**
 * A call, in the thread where it happened.
 *
 * Centred and quiet like a date separator, because it is not something anybody
 * said — it is something that took place. What it has to carry is the three
 * things people actually go looking for afterwards: whether it connected, how
 * long it ran, and whether there is a recording.
 */
export default function CallRow({ call, meId, formats, onPlay }: Readonly<Props>) {
  const { t } = useTranslation();
  const outgoing = call.from_user_id === meId;
  const answered = call.outcome === 'ANSWERED';
  const when = call.started_at ? formats.full.format(new Date(call.started_at)) : '';
  const noteKey = OUTCOME_KEY[call.outcome];
  const note = noteKey ? t(noteKey) : '';
  const video = call.kind === 'VIDEO';
  const label = t(KIND_KEY[outgoing ? 'out' : 'in'][video ? 'video' : 'audio']);

  return (
    <Stack
      sx={{
        alignItems: "center",
        my: 0.5
      }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          px: 1.5,
          py: 0.75,
          borderRadius: 4,
          bgcolor: 'action.hover',
          maxWidth: '90%'
        }}>
        {answered ? (
          <Box sx={{ display: 'inline-flex', color: 'text.secondary' }}>
            {call.kind === 'VIDEO' ? (
              <VideocamIcon fontSize="small" />
            ) : (
              <CallIcon fontSize="small" />
            )}
          </Box>
        ) : (
          <CallMissedIcon fontSize="small" color="error" />
        )}

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
            {label}
            {note ? ` · ${note}` : ''}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {when}
            {answered ? ` · ${callDuration(call.duration_seconds)}` : ''}
          </Typography>
        </Box>

        {call.recording_url && (
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            icon={<PlayCircleOutlineIcon />}
            label={t('shell.chat.callRow.recording')}
            aria-label={t('shell.chat.callRow.play')}
            onClick={() => onPlay(call.recording_url as string)}
          />
        )}
        {call.recording_url && (
          <Tooltip title={t('shell.chat.callRow.download')}>
            <DuncitIconButton
              size="small"
              component={Link}
              href={call.recording_url}
              download="call-recording.mp4"
              target="_blank"
              rel="noreferrer"
              aria-label={t('shell.chat.callRow.download')}
            >
              <DownloadIcon fontSize="small" />
            </DuncitIconButton>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  );
}
