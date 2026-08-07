import { IconButton, Tooltip } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import CallToggle from './CallToggle';

export interface LiveControlsProps {
  /** A video call: the camera, share and fullscreen controls only exist here. */
  video: boolean;
  muted: boolean;
  cameraOff: boolean;
  sharing: boolean;
  /** True while the take is running — not while it uploads or converts. */
  recording: boolean;
  /** Disabled while a finished take is still being saved. */
  recordBusy: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleFullscreen: () => void;
  onShare: () => void;
  onStopSharing: () => void;
  onToggleRecord: () => void;
}

/** The controls that only exist once the call is up. */
export default function LiveControls({
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
}: Readonly<LiveControlsProps>) {
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
