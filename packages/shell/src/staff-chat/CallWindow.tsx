import FloatingWindow from '../floating-window';
import CallPanel from './call-panel';
import type { Coworker } from './queries';
import type { useCall } from './useCall';
import type { useCallRecorder } from './useCallRecorder';

type Call = ReturnType<typeof useCall>;
type Recorder = ReturnType<typeof useCallRecorder>;

interface Props {
  open: boolean;
  peer: Coworker | null;
  call: Call;
  recorder: Recorder;
  onSendRecording: (url: string) => void;
}

const SUBTITLE: Record<string, string> = {
  ringing: 'Calling…',
  incoming: 'Incoming call',
  connected: 'On a call',
};

/**
 * The call, in a window of its own.
 *
 * It used to be a strip inside the chat sidebar, which made the video 380px
 * wide and pinned the call to whatever the sidebar was doing. A call is not a
 * part of a conversation panel — it is its own session, and it should be
 * movable, resizable and out of the way while the page underneath stays usable.
 *
 * Closing it hangs up, which is why it asks first.
 */
export default function CallWindow({
  open,
  peer,
  call,
  recorder,
  onSendRecording,
}: Readonly<Props>) {
  /*
    Whose call this is.

    The open CONVERSATION is not the answer: a call can arrive while the chat
    is closed or while a different thread is on screen, and this window is the
    only thing on the page at that moment. The name travels with the offer
    itself, so it is right even before anything has loaded; `peer` is only the
    fallback for a call you placed from a thread you are already looking at.
  */
  const onCall = peer?.id === call.peerId ? peer : null;
  const name = call.peerName || onCall?.name || 'Coworker';
  const photo = onCall?.photo ?? '';
  const live = call.phase !== 'idle';

  return (
    <FloatingWindow
      open={open}
      title={call.kind === 'VIDEO' ? `Video with ${name}` : `Call with ${name}`}
      subtitle={SUBTITLE[call.phase]}
      initial={{ x: 80, y: 80, width: 520, height: 460 }}
      fill
      closeWarning={
        live
          ? {
              title: 'End this call?',
              message: `Closing this window hangs up on ${name}. Any recording still uploading will finish.`,
              confirmLabel: 'End call',
            }
          : undefined
      }
      onClose={() => {
        call.hangUp();
        recorder.reset();
      }}
    >
      <CallPanel
        phase={call.phase}
        kind={call.kind}
        peerName={name}
        peerPhoto={photo}
        error={call.error}
        localStream={call.localStream}
        remoteStream={call.remoteStream}
        onAnswer={() => call.answer().catch(() => undefined)}
        onDecline={call.decline}
        onHangUp={call.hangUp}
        micId={call.micId}
        camId={call.camId}
        onMic={call.setMicId}
        onCam={call.setCamId}
        sharing={call.sharing}
        onShare={() => call.shareScreen().catch(() => undefined)}
        onStopSharing={() => call.stopSharing().catch(() => undefined)}
        muted={call.muted}
        cameraOff={call.cameraOff}
        onToggleMute={call.toggleMute}
        onToggleCamera={call.toggleCamera}
        recordStage={recorder.stage}
        recordPct={recorder.pct}
        recordUrl={recorder.url}
        recordError={recorder.error}
        onToggleRecord={recorder.toggle}
        onSendRecording={onSendRecording}
        onDismissRecording={recorder.reset}
      />
    </FloatingWindow>
  );
}
