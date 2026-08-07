import { Box, Button, IconButton, Stack, Tooltip } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import CallSettingsMenu from './CallSettingsMenu';
import type { CallKind, CallPhase } from './useCall';

interface Props {
  phase: CallPhase;
  kind: CallKind;
  muted: boolean;
  cameraOff: boolean;
  sharing: boolean;
  micId: string;
  camId: string;
  onAnswer: () => void;
  onDecline: () => void;
  onHangUp: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleFullscreen: () => void;
  onShare: () => void;
  onStopSharing: () => void;
  onMic: (id: string) => void;
  onCam: (id: string) => void;
}

/**
 * The row you press things on.
 *
 * Answer/decline while it is ringing, everything else once it is up. Split out
 * of the panel because a call panel that also holds nine controls is one
 * component doing the whole feature.
 */
export default function CallControls({
  phase,
  kind,
  muted,
  cameraOff,
  sharing,
  micId,
  camId,
  onAnswer,
  onDecline,
  onHangUp,
  onToggleMute,
  onToggleCamera,
  onToggleFullscreen,
  onShare,
  onStopSharing,
  onMic,
  onCam,
}: Readonly<Props>) {
  const live = phase === 'connected';
  const video = kind === 'VIDEO';

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {phase === 'incoming' ? (
        <>
          <Button size="small" variant="contained" color="success" startIcon={<CallIcon />} onClick={onAnswer}>
            Answer
          </Button>
          <Button size="small" variant="outlined" color="error" startIcon={<CallEndIcon />} onClick={onDecline}>
            Decline
          </Button>
        </>
      ) : (
        <Button size="small" variant="contained" color="error" startIcon={<CallEndIcon />} onClick={onHangUp}>
          {phase === 'ringing' ? 'Cancel' : 'Hang up'}
        </Button>
      )}

      {live && (
        <Tooltip title={muted ? 'Unmute' : 'Mute'}>
          <IconButton
            size="small"
            color={muted ? 'error' : 'inherit'}
            aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
            aria-pressed={muted}
            onClick={onToggleMute}
          >
            {muted ? <MicOffIcon fontSize="small" /> : <MicIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      )}

      {live && video && (
        <Tooltip title={cameraOff ? 'Turn camera on' : 'Turn camera off'}>
          <IconButton
            size="small"
            color={cameraOff ? 'error' : 'inherit'}
            aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
            aria-pressed={cameraOff}
            onClick={onToggleCamera}
          >
            {cameraOff ? <VideocamOffIcon fontSize="small" /> : <VideocamIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      )}

      {live && video && (
        <Tooltip title="Full screen">
          <IconButton size="small" color="inherit" aria-label="Full screen video" onClick={onToggleFullscreen}>
            <FullscreenIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {live && video && (
        <Tooltip title={sharing ? 'Stop sharing' : 'Share your screen'}>
          <IconButton
            size="small"
            color={sharing ? 'primary' : 'inherit'}
            aria-label={sharing ? 'Stop sharing your screen' : 'Share your screen'}
            aria-pressed={sharing}
            onClick={sharing ? onStopSharing : onShare}
          >
            {sharing ? <StopScreenShareIcon fontSize="small" /> : <ScreenShareIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      )}

      <Box sx={{ flex: 1 }} />
      <CallSettingsMenu micId={micId} camId={camId} onMic={onMic} onCam={onCam} showCamera={video} />
    </Stack>
  );
}
