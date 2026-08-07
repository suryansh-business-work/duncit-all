import CallWindow from './CallWindow';
import RecordingPlayer from './RecordingPlayer';
import type { Coworker } from './queries';
import type { useCall } from './useCall';
import type { useCallRecorder } from './useCallRecorder';

interface Props {
  peer: Coworker | null;
  call: ReturnType<typeof useCall>;
  recorder: ReturnType<typeof useCallRecorder>;
  callOpen: boolean;
  playingRecording: string | null;
  onClosePlayer: () => void;
  onSendRecording: (url: string) => void;
}

/**
 * Everything staff chat puts OVER the page rather than inside its sidebar.
 *
 * Grouped because they share one rule: neither belongs to the panel's layout.
 * A call and a recording being watched both outlive whichever conversation is
 * open, and the call has to survive the sidebar being closed entirely.
 */
export default function ChatWindows({
  peer,
  call,
  recorder,
  callOpen,
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
    </>
  );
}
