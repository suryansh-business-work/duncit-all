import { useRef } from 'react';
import { Alert, Box, Stack } from '@mui/material';
import CallWaveform from '../CallWaveform';
import CallControls from '../call-controls';
import CallRecorder from '../CallRecorder';
import ConnectionMeter from '../ConnectionMeter';
import { useTranslation } from '../../i18n/useTranslation';
import CallHeader from './CallHeader';
import CallStage from './CallStage';
import type { CallKind, CallPhase } from '../useCall';
import type { RecordStage } from '../useCallRecorder';

interface Props {
  phase: CallPhase;
  kind: CallKind;
  /** Resolved by the window: the offer carries it, not the open thread. */
  peerName: string;
  peerPhoto: string;
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
  /** The take, and everything that happens to it after "stop". */
  recordStage: RecordStage;
  recordPct: number;
  recordUrl: string | null;
  recordError: string | null;
  onToggleRecord: () => void;
  onSendRecording: (url: string) => void;
  onDismissRecording: () => void;
}

/**
 * The call, above the conversation it belongs to.
 *
 * In its own window rather than a dialog: hanging up should not cost you the
 * thread you were talking about.
 */
export default function CallPanel({
  phase,
  kind,
  peerName,
  peerPhoto,
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
  recordStage,
  recordPct,
  recordUrl,
  recordError,
  onToggleRecord,
  onSendRecording,
  onDismissRecording,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const connected = phase === 'connected';
  // Uploading and converting outlive the call: hanging up is the normal way to
  // finish a recording, and taking the progress away then loses it.
  const savingRecording = recordStage !== 'IDLE' && recordStage !== 'RECORDING';
  if (phase === 'idle' && !error && !savingRecording) return null;

  const toggleFullscreen = () => {
    const node = stageRef.current;
    if (!node) return;
    if (globalThis.document.fullscreenElement) {
      globalThis.document.exitFullscreen().catch(() => undefined);
    } else {
      node.requestFullscreen?.().catch(() => undefined);
    }
  };

  /*
    A fixed floor, with the picture above it.

    No frame of its own — this lives inside a FloatingWindow, and a bordered
    card inside a window is two frames drawing the same box. The column is
    full-height so the video can take whatever is left while the controls stay
    exactly where they were: a hang-up button that moves when somebody turns
    their camera on is a hang-up button you have to hunt for mid-call.
  */
  return (
    <Box
      sx={{
        p: 1.5,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {error && <Alert severity="error">{error}</Alert>}

      {phase !== 'idle' && (
        <CallHeader phase={phase} kind={kind} peerName={peerName} peerPhoto={peerPhoto} sharing={sharing} />
      )}

      {/* The one part that grows. Everything else keeps its natural height. */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {kind === 'VIDEO' && connected && (
          <CallStage ref={stageRef} localStream={localStream} remoteStream={remoteStream} />
        )}
      </Box>

      {phase !== 'idle' && (
        <Stack spacing={1} sx={{ flexShrink: 0 }}>
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
            onToggleFullscreen={toggleFullscreen}
            onShare={onShare}
            onStopSharing={onStopSharing}
            onMic={onMic}
            onCam={onCam}
            recording={recordStage === 'RECORDING'}
            recordBusy={savingRecording}
            onToggleRecord={onToggleRecord}
          />

          {/* Bottom of the call, under the controls: the line is carrying
              something, or it is not, and an audio call gives no other sign.
              Ambient, so it sits below the things you actually press. */}
          {connected && (
            <CallWaveform stream={remoteStream} label={t('shell.chat.call.incomingAudio', { vars: { name: peerName } })} />
          )}

          {/* Bottom of the call: how good the line is, when the portal has
              given us something of ours to measure against. */}
          {connected && <ConnectionMeter probeUrl={probeUrl} probeBytes={probeBytes} />}
        </Stack>
      )}

      {/* Outside the call block on purpose — see savingRecording above. */}
      <Box sx={{ flexShrink: 0 }}>
        <CallRecorder
          stage={recordStage}
          pct={recordPct}
          url={recordUrl}
          error={recordError}
          onSendToChat={onSendRecording}
          onDismiss={onDismissRecording}
        />
      </Box>
    </Box>
  );
}
