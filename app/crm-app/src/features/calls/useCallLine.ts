import { useCallback, useEffect, useRef, useState } from 'react';
import { crmIsTerminalCallStatus } from '@duncit/utils';
import { fireAndForget, logs } from '@duncit/logs';

import {
  CrmAppActiveCallDocument,
  CrmAppControlCallDocument,
  CrmAppReconcileCallDocument,
  CrmAppStartCallDocument,
} from '@/graphql/call';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import {
  applyStatusCheck,
  IDLE_CALL,
  restoredCall,
  type CallLead,
  type CallState,
  type ControlAction,
} from './callLine';

const SCOPE = 'crm-app/useCallLine';
/** How often a live call's status and transcript are read. */
export const CALL_POLL_MS = 3000;
/** Consecutive failed checks after which the screen stops asking (the API is down). */
const MAX_FAILED_CHECKS = 4;

/**
 * Everything about one call on the CRM call line, as the portal's call window
 * runs it: placing it, its live status and transcript, mute / hold / end. The
 * portal hears status over its socket; the app reads the same server state
 * every few seconds, with Twilio's re-synced status as the source of truth.
 */
export function useCallLine(lead: CallLead, fallbackError: string) {
  const [state, setState] = useState<CallState>(IDLE_CALL);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState<ControlAction | null>(null);
  const mounted = useRef(true);
  const live = !!state.logId && !!state.status && !crmIsTerminalCallStatus(state.status);

  const update = useCallback((change: (s: CallState) => CallState) => {
    if (mounted.current) setState(change);
  }, []);

  // A call still live for this lead (the app was closed mid-call) comes back with its transcript.
  useEffect(() => {
    mounted.current = true;
    const restore = async () => {
      const { myActiveCrmCall } = await gqlRequest(CrmAppActiveCallDocument, {});
      if (myActiveCrmCall?.entity_id === lead.leadId) update(() => restoredCall(myActiveCrmCall));
    };
    fireAndForget(restore(), logs.mobileApp, SCOPE, 'restore');
    return () => {
      mounted.current = false;
    };
  }, [lead.leadId, update]);

  useEffect(() => {
    const logId = state.logId;
    if (!live || !logId) return;
    let stopped = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        const [reconciled, active] = await Promise.all([
          gqlRequest(CrmAppReconcileCallDocument, { log_id: logId }),
          gqlRequest(CrmAppActiveCallDocument, {}),
        ]);
        failures = 0;
        update((s) =>
          applyStatusCheck(s, reconciled.reconcileCrmCall.status, active.myActiveCrmCall),
        );
      } catch (error) {
        failures += 1;
        logs.mobileApp.warn(SCOPE, 'statusCheck', { error, failures });
        update((s) => ({ ...s, connectionLost: true }));
        if (failures >= MAX_FAILED_CHECKS) stopped = true;
      }
      if (!stopped)
        timer = setTimeout(
          () => fireAndForget(check(), logs.mobileApp, SCOPE, 'check'),
          CALL_POLL_MS,
        );
    };
    timer = setTimeout(() => fireAndForget(check(), logs.mobileApp, SCOPE, 'check'), CALL_POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [live, state.logId, update]);

  /** Place the call: Twilio rings the agent's phone, then joins the contact in. */
  const start = async () => {
    setStarting(true);
    update(() => IDLE_CALL);
    try {
      const { startCrmPortalCall: placed } = await gqlRequest(CrmAppStartCallDocument, {
        entity_type: lead.kind,
        id: lead.leadId,
        contact_number: lead.to,
        contact_name: lead.contactName || null,
      });
      if (placed.ok && placed.log_id) {
        const logId = placed.log_id;
        update((s) => ({ ...s, logId, status: 'INITIATED' }));
      } else {
        update((s) => ({
          ...s,
          error: placed.message || fallbackError,
          errorCode: placed.code ?? 'UNKNOWN',
        }));
      }
    } catch (error) {
      update((s) => ({ ...s, error: errorMessage(error, fallbackError), errorCode: 'UNKNOWN' }));
    } finally {
      if (mounted.current) setStarting(false);
    }
  };

  /** Mute / hold / end. Resolves true when Twilio accepted it. */
  const control = async (action: ControlAction): Promise<boolean> => {
    const logId = state.logId;
    if (!logId) return false;
    setBusy(action);
    try {
      const { controlCrmCall: result } = await gqlRequest(CrmAppControlCallDocument, {
        log_id: logId,
        action,
      });
      if (!result.ok) {
        update((s) => ({ ...s, error: result.message || fallbackError }));
        return false;
      }
      update((s) => ({ ...s, muted: result.muted, onHold: result.on_hold, error: null }));
      return true;
    } catch (error) {
      update((s) => ({ ...s, error: errorMessage(error, fallbackError) }));
      return false;
    } finally {
      if (mounted.current) setBusy(null);
    }
  };

  return { ...state, live, starting, busy, start, control };
}

export type CallLine = ReturnType<typeof useCallLine>;
