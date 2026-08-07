import { useRef } from 'react';
import { Alert, Box, Paper, Stack } from '@mui/material';
import CallWaveform from '../CallWaveform';
import CallControls from '../call-controls';
import CallRecorder from '../CallRecorder';
import ConnectionMeter from '../ConnectionMeter';
import CallHeader from './CallHeader';
import CallStage from './CallStage';
import type { Coworker } from '../queries';
import type { CallKind, CallPhase } from '../useCall';
import type { RecordStage } from '../useCallRecorder';

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
  recordStage,
  recordPct,
  recordUrl,
  recordError,
  onToggleRecord,
  onSendRecording,
  onDismissRecording,
}: Readonly<Props>) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const connected = phase === 'connected';
  // Uploading and converting outlive the call — hanging up is the normal way to
  // finish a recording, and taking the progress and the download away at that
  // moment loses the thing the person was recording FOR.
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

  return (
    <Paper variant="outlined" sx={{ m: 1, p: 1.5 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      {phase !== 'idle' && (
        <Stack spacing={1}>
          <CallHeader phase={phase} kind={kind} peer={peer} sharing={sharing} />

          {kind === 'VIDEO' && connected && (
            <CallStage ref={stageRef} localStream={localStream} remoteStream={remoteStream} />
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
            <CallWaveform stream={remoteStream} label={`${peer?.name ?? 'They'} — incoming audio`} />
          )}

          {/* Bottom of the call: how good the line is, when the portal has
              given us something of ours to measure against. */}
          {connected && <ConnectionMeter probeUrl={probeUrl} probeBytes={probeBytes} />}
        </Stack>
      )}

      {/* Outside the call block on purpose — see savingRecording above. */}
      <Box sx={{ mt: phase === 'idle' ? 0 : 1 }}>
        <CallRecorder
          stage={recordStage}
          pct={recordPct}
          url={recordUrl}
          error={recordError}
          onSendToChat={onSendRecording}
          onDismiss={onDismissRecording}
        />
      </Box>
    </Paper>
  );
}
