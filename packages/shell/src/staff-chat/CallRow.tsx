import { Box, Chip, IconButton, Link, Stack, Tooltip, Typography } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import CallMissedIcon from '@mui/icons-material/CallMissed';
import VideocamIcon from '@mui/icons-material/Videocam';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import DownloadIcon from '@mui/icons-material/Download';
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

const OUTCOME_TEXT: Record<StaffCall['outcome'], string> = {
  ANSWERED: '',
  MISSED: 'Missed',
  DECLINED: 'Declined',
  CANCELLED: 'Cancelled',
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
  const outgoing = call.from_user_id === meId;
  const answered = call.outcome === 'ANSWERED';
  const when = call.started_at ? formats.full.format(new Date(call.started_at)) : '';
  const note = OUTCOME_TEXT[call.outcome];
  const direction = outgoing ? 'Outgoing' : 'Incoming';
  const label = `${direction} ${call.kind === 'VIDEO' ? 'video' : 'audio'} call`;

  return (
    <Stack alignItems="center" sx={{ my: 0.5 }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          px: 1.5,
          py: 0.75,
          borderRadius: 4,
          bgcolor: 'action.hover',
          maxWidth: '90%',
        }}
      >
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
          <Typography variant="caption" color="text.secondary">
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
            label="Recording"
            onClick={() => onPlay(call.recording_url as string)}
          />
        )}
        {call.recording_url && (
          <Tooltip title="Download the recording">
            <IconButton
              size="small"
              component={Link}
              href={call.recording_url}
              download="call-recording.mp4"
              target="_blank"
              rel="noreferrer"
              aria-label="Download the recording"
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  );
}
