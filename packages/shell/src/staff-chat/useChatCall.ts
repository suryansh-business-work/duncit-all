import { useEffect, useRef } from 'react';
import { useCall } from './useCall';
import { useCallRecorder } from './useCallRecorder';
import type { useChatState } from './useChatState';
import { useRecordingAttach } from './useRecordingAttach';
import type { useStaffChatData } from './useStaffChatData';

interface ChatCallInput {
  /** Your own id, so the call knows which end of the line it is. */
  meId: string;
  data: ReturnType<typeof useStaffChatData>;
  chat: ReturnType<typeof useChatState>;
  /** Show the panel — a call arrived. */
  onRequestOpen?: () => void;
}

/**
 * The call on this panel's line, and the recording of it.
 *
 * One hook because the three are one lifecycle: the recorder reads the call's
 * streams, the finished recording is attached to the call it was taken on, and
 * together they decide whether the call window is up and whether the panel may
 * close.
 */
export function useChatCall({ meId, data, chat, onRequestOpen }: Readonly<ChatCallInput>) {
  const { panel } = chat;
  const call = useCall(
    data.socket,
    meId,
    {
      micId: panel.micId,
      camId: panel.camId,
      micLabel: panel.micLabel,
      camLabel: panel.camLabel,
      onChoose: chat.setDevice,
    },
    data.iceServers
  );
  const recorder = useCallRecorder({
    connected: call.phase === 'connected',
    localStream: call.localStream,
    remoteStream: call.remoteStream,
  });

  /*
    A call arriving is a reason to show the panel — on the way IN, once.

    Held in a ref so the effect depends on the PHASE and nothing else. With the
    callback in the dependencies, a caller passing an inline arrow re-ran this
    on every render, and a phone that is still ringing would reopen the panel
    the instant anyone closed it. A hook should not be that easy for its caller
    to break by accident.
  */
  const requestOpen = useRef(onRequestOpen);
  requestOpen.current = onRequestOpen;
  const incoming = call.phase === 'incoming';
  useEffect(() => {
    if (incoming) requestOpen.current?.();
  }, [incoming]);

  useRecordingAttach({
    readyUrl: recorder.stage === 'READY' ? recorder.url : null,
    callId: call.lastCallId,
    attach: data.attachRecording,
    onAttached: data.refetchCalls,
  });

  /** The call window is up for anything that is not "nothing happening". */
  const callWindowOpen =
    call.phase !== 'idle' || Boolean(call.error) || recorder.stage !== 'IDLE';

  /**
   * A recording being saved pins the panel open.
   *
   * The upload and the FFmpeg pass run in this component, so closing it while
   * either is in flight throws the recording away — and it would look exactly
   * like a successful close.
   */
  const busyStage = recorder.stage === 'UPLOADING' || recorder.stage === 'CONVERTING';

  return { call, recorder, callWindowOpen, busyStage };
}
