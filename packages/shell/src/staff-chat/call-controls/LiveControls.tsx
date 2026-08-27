import { Tooltip } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
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
  const { t } = useTranslation();

  return (
    <>
      <CallToggle
        title={t(muted ? 'shell.chat.call.unmute' : 'shell.chat.call.mute')}
        label={t(muted ? 'shell.chat.call.unmuteMic' : 'shell.chat.call.muteMic')}
        on={muted}
        onClick={onToggleMute}
        onIcon={<MicOffIcon fontSize="small" />}
        offIcon={<MicIcon fontSize="small" />}
      />

      {video && (
        <CallToggle
          title={t(cameraOff ? 'shell.chat.call.cameraOn' : 'shell.chat.call.cameraOff')}
          label={t(cameraOff ? 'shell.chat.call.cameraOn' : 'shell.chat.call.cameraOff')}
          on={cameraOff}
          onClick={onToggleCamera}
          onIcon={<VideocamOffIcon fontSize="small" />}
          offIcon={<VideocamIcon fontSize="small" />}
        />
      )}

      {video && (
        <Tooltip title={t('shell.chat.call.fullscreen')}>
          <DuncitIconButton
            size="small"
            color="inherit"
            aria-label={t('shell.chat.call.fullscreenVideo')}
            onClick={onToggleFullscreen}
          >
            <FullscreenIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      )}

      {video && (
        <CallToggle
          title={t(sharing ? 'shell.chat.call.stopShare' : 'shell.chat.call.share')}
          label={t(sharing ? 'shell.chat.call.stopShareLabel' : 'shell.chat.call.share')}
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
        title={t(recording ? 'shell.chat.call.stopRecord' : 'shell.chat.call.record')}
        label={t(recording ? 'shell.chat.call.stopRecordLabel' : 'shell.chat.call.record')}
        on={recording}
        disabled={recordBusy}
        onClick={onToggleRecord}
        onIcon={<StopCircleIcon fontSize="small" />}
        offIcon={<FiberManualRecordIcon fontSize="small" />}
      />
    </>
  );
}
