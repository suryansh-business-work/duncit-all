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
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import CallSettingsMenu from './CallSettingsMenu';
import type { CallKind, CallPhase } from './useCall';

interface ToggleProps {
  title: string;
  /** Also the accessible name: the tooltip is not read by every reader. */
  label: string;
  on: boolean;
  onColor?: 'error' | 'primary';
  disabled?: boolean;
  onClick: () => void;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
}

/**
 * One on/off control in the call row.
 *
 * Every one of these was the same eleven lines with two words changed, and each
 * copy was another place for the pressed state and the label to drift apart.
 */
function CallToggle({
  title,
  label,
  on,
  onColor = 'error',
  disabled,
  onClick,
  onIcon,
  offIcon,
}: Readonly<ToggleProps>) {
  return (
    <Tooltip title={title}>
      {/* A disabled button fires no events, so the tooltip needs a live wrapper. */}
      <span>
        <IconButton
          size="small"
          color={on ? onColor : 'inherit'}
          aria-label={label}
          aria-pressed={on}
          disabled={disabled}
          onClick={onClick}
        >
          {on ? onIcon : offIcon}
        </IconButton>
      </span>
    </Tooltip>
  );
}

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
  /** True while the take is running — not while it uploads or converts. */
  recording: boolean;
  /** Disabled while a finished take is still being saved. */
  recordBusy: boolean;
  onToggleRecord: () => void;
}

/** The controls that only exist once the call is up. */
function LiveControls({
  video,
  muted,
  cameraOff,
  sharing,
  recording,
  recordBusy,
  onToggleMute,
  onToggleCamera,
  onToggleFullscreen,
  onShare,
  onStopSharing,
  onToggleRecord,
}: Readonly<
  Pick<
    Props,
    | 'muted'
    | 'cameraOff'
    | 'sharing'
    | 'recording'
    | 'recordBusy'
    | 'onToggleMute'
    | 'onToggleCamera'
    | 'onToggleFullscreen'
    | 'onShare'
    | 'onStopSharing'
    | 'onToggleRecord'
  > & { video: boolean }
>) {
  return (
    <>
      <CallToggle
        title={muted ? 'Unmute' : 'Mute'}
        label={muted ? 'Unmute microphone' : 'Mute microphone'}
        on={muted}
        onClick={onToggleMute}
        onIcon={<MicOffIcon fontSize="small" />}
        offIcon={<MicIcon fontSize="small" />}
      />

      {video && (
        <CallToggle
          title={cameraOff ? 'Turn camera on' : 'Turn camera off'}
          label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
          on={cameraOff}
          onClick={onToggleCamera}
          onIcon={<VideocamOffIcon fontSize="small" />}
          offIcon={<VideocamIcon fontSize="small" />}
        />
      )}

      {video && (
        <Tooltip title="Full screen">
          <IconButton
            size="small"
            color="inherit"
            aria-label="Full screen video"
            onClick={onToggleFullscreen}
          >
            <FullscreenIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {video && (
        <CallToggle
          title={sharing ? 'Stop sharing' : 'Share your screen'}
          label={sharing ? 'Stop sharing your screen' : 'Share your screen'}
          on={sharing}
          onColor="primary"
          onClick={sharing ? onStopSharing : onShare}
          onIcon={<StopScreenShareIcon fontSize="small" />}
          offIcon={<ScreenShareIcon fontSize="small" />}
        />
      )}

      {/* Recording is offered on audio calls too — most of what is worth
          keeping from a call is what was said, not what was on screen. */}
      <CallToggle
        title={recording ? 'Stop recording' : 'Record this call'}
        label={recording ? 'Stop recording this call' : 'Record this call'}
        on={recording}
        disabled={recordBusy}
        onClick={onToggleRecord}
        onIcon={<StopCircleIcon fontSize="small" />}
        offIcon={<FiberManualRecordIcon fontSize="small" />}
      />
    </>
  );
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
  micId,
  camId,
  onAnswer,
  onDecline,
  onHangUp,
  onMic,
  onCam,
  ...live
}: Readonly<Props>) {
  const connected = phase === 'connected';
  const video = kind === 'VIDEO';
  const hangUpLabel = phase === 'ringing' ? 'Cancel' : 'Hang up';

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {phase === 'incoming' ? (
        <>
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<CallIcon />}
            onClick={onAnswer}
          >
            Answer
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<CallEndIcon />}
            onClick={onDecline}
          >
            Decline
          </Button>
        </>
      ) : (
        <Button
          size="small"
          variant="contained"
          color="error"
          startIcon={<CallEndIcon />}
          onClick={onHangUp}
        >
          {hangUpLabel}
        </Button>
      )}

      {connected && <LiveControls video={video} {...live} />}

      <Box sx={{ flex: 1 }} />
      <CallSettingsMenu micId={micId} camId={camId} onMic={onMic} onCam={onCam} showCamera={video} />
    </Stack>
  );
}
