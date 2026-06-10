import { useEffect, useRef } from 'react';
import { CRM_CALL_EVENT, getCallSocket, type CallStatusPayload } from '../lib/callSocket';

/**
 * Subscribes to live CRM call-status events for the signed-in agent. The
 * callback fires whenever the server pushes a lifecycle update (RINGING →
 * IN_PROGRESS → COMPLETED, etc.), letting the UI mark a call "over" the instant
 * Twilio reports the customer hung up — no polling.
 */
export function useCallSocket(onStatus: (payload: CallStatusPayload) => void) {
  const handlerRef = useRef(onStatus);
  handlerRef.current = onStatus;

  useEffect(() => {
    const socket = getCallSocket();
    if (!socket) return;
    const listener = (payload: CallStatusPayload) => handlerRef.current(payload);
    socket.on(CRM_CALL_EVENT, listener);
    return () => {
      socket.off(CRM_CALL_EVENT, listener);
    };
  }, []);
}
