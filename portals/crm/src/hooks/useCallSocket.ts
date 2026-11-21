import { useEffect, useRef, useState } from 'react';
import {
  CRM_CALL_EVENT,
  CRM_CALL_TRANSCRIPT_EVENT,
  getCallSocket,
  type CallStatusPayload,
  type CallTranscriptPayload,
} from '../lib/callSocket';

/** Subscribes to one server event on the shared CRM call socket for the component's lifetime. */
function useCallEvent<T>(event: string, onEvent: (payload: T) => void) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const socket = getCallSocket();
    if (!socket) return;
    const listener = (payload: T) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [event]);
}

/**
 * Subscribes to live CRM call-status events for the signed-in agent. The
 * callback fires whenever the server pushes a lifecycle update (RINGING →
 * IN_PROGRESS → COMPLETED, etc.), letting the UI mark a call "over" the instant
 * Twilio reports the customer hung up — no polling.
 */
export function useCallSocket(onStatus: (payload: CallStatusPayload) => void) {
  useCallEvent(CRM_CALL_EVENT, onStatus);
}

/** Whether live call updates are reaching the browser right now (the call itself does not depend on it). */
export function useCallSocketConnected(): boolean {
  const [connected, setConnected] = useState(() => getCallSocket()?.connected ?? false);

  useEffect(() => {
    const socket = getCallSocket();
    if (!socket) return;
    const up = () => setConnected(true);
    const down = () => setConnected(false);
    socket.on('connect', up);
    socket.on('disconnect', down);
    setConnected(socket.connected);
    return () => {
      socket.off('connect', up);
      socket.off('disconnect', down);
    };
  }, []);

  return connected;
}

/** Live transcript segments of the agent's calls, one finished utterance at a time. */
export function useCallTranscriptSocket(onSegment: (payload: CallTranscriptPayload) => void) {
  useCallEvent(CRM_CALL_TRANSCRIPT_EVENT, onSegment);
}
