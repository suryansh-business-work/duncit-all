import { useEffect, useRef } from 'react';
import { useMutation } from '@apollo/client';
import { RECONCILE_CRM_CALL } from '../api/call.gql';
import { isTerminalCallStatus, type CallStatus } from '../lib/callSocket';

/**
 * Polls the server to re-sync a live call's status from Twilio while it's
 * active. Fallback for when the async status webhook is missed/unreachable, so
 * the dialog reflects a customer hang-up even without the socket event. Stops
 * once the call reaches a terminal status.
 */
export function useCallReconcile(logId: string | null, onStatus: (status: CallStatus) => void) {
  const [reconcile] = useMutation(RECONCILE_CRM_CALL);
  const cb = useRef(onStatus);
  cb.current = onStatus;

  useEffect(() => {
    if (!logId) return;
    let stopped = false;
    let errors = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stopped) return;
      try {
        const res = await reconcile({ variables: { log_id: logId } });
        errors = 0;
        const status = res.data?.reconcileCrmCall?.status as CallStatus | undefined;
        if (status) {
          cb.current(status);
          if (isTerminalCallStatus(status)) {
            stopped = true;
            return;
          }
        }
      } catch {
        // Stop after a few consecutive failures (e.g. API down) so we don't spam.
        errors += 1;
        if (errors >= 4) {
          stopped = true;
          return;
        }
      }
      if (!stopped) timer = setTimeout(tick, 4000);
    };
    timer = setTimeout(tick, 4000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [logId, reconcile]);
}
