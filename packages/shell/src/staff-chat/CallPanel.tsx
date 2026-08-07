import { useEffect, useRef } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import CallSettingsMenu from './CallSettingsMenu';
import CallWaveform from './CallWaveform';
import CallControls from './CallControls';
import ConnectionMeter from './ConnectionMeter';
import CallEndIcon from '@mui/icons-material/CallEnd';
import CallIcon from '@mui/icons-material/Call';
import type { Coworker } from './queries';
import type { CallKind, CallPhase } from './useCall';

interface Props {
  phase: CallPhase;
  kind: CallKind;
  peer: Coworker | null;
  error: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAnswer: () => void;
  onDecline: () => void;
  onHangUp: () => void;
  /** Which devices the call opens. */
  micId: string;
  camId: string;
  onMic: (id: string) => void;
  onCam: (id: string) => void;
  /** True while the screen is going out in place of the camera. */
  sharing: boolean;
  onShare: () => void;
  onStopSharing: () => void;
  muted: boolean;
  cameraOff: boolean;
  /** Where the connection meter fetches from. Absent means no meter. */
  probeUrl?: string;
  probeBytes?: number;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

/** Video elements take a stream through a property, not an attribute. */
function Video({ stream, muted }: Readonly<{ stream: MediaStream | null; muted?: boolean }>) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <Box
      component="video"
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      sx={{ width: '100%', borderRadius: 1, bgcolor: 'common.black' }}
    />
  );
}

const LABEL: Record<CallPhase, string> = {
  idle: '',
  ringing: 'Ringing…',
  incoming: 'is calling',
  connected: 'Connected',
};

/**
 * The call, above the conversation it belongs to.
 *
 * In the same panel rather than a dialog: hanging up should not cost you the
 * thread you were talking about, and a call window that covers the chat is a
 * call you cannot take notes during.
 */
export default function CallPanel({
  phase,
  kind,
  peer,
  error,
  localStream,
  remoteStream,
  onAnswer,
  onDecline,
  onHangUp,
  micId,
  camId,
  onMic,
  onCam,
  sharing,
  onShare,
  onStopSharing,
  muted,
  cameraOff,
  probeUrl,
  probeBytes,
  onToggleMute,
  onToggleCamera,
}: Readonly<Props>) {
  // What goes full screen: the video stage, not the whole panel — the controls
  // and the conversation behind them have no business filling a monitor.
  const stageRef = useRef<HTMLDivElement | null>(null);
  if (phase === 'idle' && !error) return null;

  return (
    <Paper variant="outlined" sx={{ m: 1, p: 1.5 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      {phase !== 'idle' && (
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {/* A ring that pulses while it rings — a static avatar and a word
                is not enough to tell "calling" from "on a call" at a glance. */}
            <Avatar src={peer?.photo || undefined} sx={{ width: 32, height: 32 }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" noWrap>
                {peer?.name ?? 'Coworker'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {kind === 'VIDEO' ? 'Video' : 'Audio'} · {LABEL[phase]}
                {sharing ? ' · sharing your screen' : ''}
              </Typography>
            </Box>
          </Stack>

          {kind === 'VIDEO' && phase === 'connected' && (
            <Stack spacing={0.5} ref={stageRef} sx={{ bgcolor: 'common.black', borderRadius: 1 }}>
              <Video stream={remoteStream} />
              {/* Muted on purpose: hearing your own microphone is feedback. */}
              <Box sx={{ width: '40%' }}>
                <Video stream={localStream} muted />
              </Box>
            </Stack>
          )}

          <CallControls
            phase={phase}
            kind={kind}
            muted={muted}
            cameraOff={cameraOff}
            sharing={sharing}
            micId={micId}
            camId={camId}
            onAnswer={onAnswer}
            onDecline={onDecline}
            onHangUp={onHangUp}
            onToggleMute={onToggleMute}
            onToggleCamera={onToggleCamera}
            onToggleFullscreen={() => {
              // The video stage, not the panel — the controls and the
              // conversation behind them have no business filling a monitor.
              const node = stageRef.current;
              if (!node) return;
              if (globalThis.document.fullscreenElement) {
                globalThis.document.exitFullscreen().catch(() => undefined);
              } else {
                node.requestFullscreen?.().catch(() => undefined);
              }
            }}
            onShare={onShare}
            onStopSharing={onStopSharing}
            onMic={onMic}
            onCam={onCam}
          />

          {/* Bottom of the call, under the controls: the line is carrying
              something, or it is not, and an audio call gives no other sign.
              Ambient, so it sits below the things you actually press. */}
          {phase === 'connected' && (
            <CallWaveform stream={remoteStream} label={`${peer?.name ?? 'They'} — incoming audio`} />
          )}

          {/* Bottom of the call: how good the line is, when the portal has
              given us something of ours to measure against. */}
          {phase === 'connected' && (
            <ConnectionMeter probeUrl={probeUrl} probeBytes={probeBytes} />
          )}
        </Stack>
      )}
    </Paper>
  );
}
