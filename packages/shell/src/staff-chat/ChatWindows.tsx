import FloatingWindow from '../floating-window';
import CallWindow from './CallWindow';
import RecordingPlayer from './RecordingPlayer';
import ScreenSharePanel from './remote-control/ScreenSharePanel';
import type { Coworker } from './queries';
import type { useCall } from './useCall';
import type { useCallRecorder } from './useCallRecorder';

interface Props {
  peer: Coworker | null;
  call: ReturnType<typeof useCall>;
  recorder: ReturnType<typeof useCallRecorder>;
  callOpen: boolean;
  sharing: boolean;
  onStopSharing: () => void;
  playingRecording: string | null;
  onClosePlayer: () => void;
  onSendRecording: (url: string) => void;
}

/**
 * Everything staff chat puts OVER the page rather than inside its sidebar.
 *
 * Grouped because they share one rule: none of them belong to the panel's
 * layout. A call, a shared screen and a recording being watched all outlive
 * whichever conversation is open, and two of them have to survive the sidebar
 * being closed entirely.
 */
export default function ChatWindows({
  peer,
  call,
  recorder,
  callOpen,
  sharing,
  onStopSharing,
  playingRecording,
  onClosePlayer,
  onSendRecording,
}: Readonly<Props>) {
  return (
    <>
      <RecordingPlayer url={playingRecording} onClose={onClosePlayer} />

      <CallWindow
        open={callOpen}
        peer={peer}
        call={call}
        recorder={recorder}
        onSendRecording={onSendRecording}
      />

      {/* Its own window, not a strip inside the call: a shared screen with a
          pointer on it is the thing being looked at, and it needs to be
          resizable independently of the call it belongs to. */}
      {sharing && peer && (
        <FloatingWindow
          open
          title={`Screen with ${peer.name}`}
          subtitle="Drag to move · pull the corner to resize"
          initial={{ x: 120, y: 120, width: 720, height: 520 }}
          closeWarning={{
            title: 'Stop sharing your screen?',
            message: `${peer.name} will stop seeing your screen, and any control you gave them ends.`,
            confirmLabel: 'Stop sharing',
          }}
          onClose={onStopSharing}
        >
          <ScreenSharePanel peerId={peer.id} peerName={peer.name} onClose={onStopSharing} />
        </FloatingWindow>
      )}
    </>
  );
}
