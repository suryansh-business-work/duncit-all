import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { crmMergeSegment, parseApiError } from '@duncit/utils';
import {
  CONTROL_CRM_CALL,
  START_CRM_PORTAL_CALL,
  type CallControlResult,
  type CrmAiCallResult,
  type LiveCallLog,
  type TranscriptSegment,
} from '../../api/call.gql';
import { useCallSocket, useCallTranscriptSocket } from '../../hooks/useCallSocket';
import { useCallReconcile } from '../../hooks/useCallReconcile';
import { isTerminalCallStatus, type CallStatus } from '../../lib/callSocket';
import type { CallLead, CallSessionState, ControlAction } from './callSession.types';

const IDLE: Omit<CallSessionState, 'lead'> = {
  logId: null,
  status: null,
  answeredAt: null,
  muted: false,
  onHold: false,
  segments: [],
  error: null,
  errorCode: null,
};

/** Add a segment once (Twilio may send it twice), keeping spoken order — shared with the CRM app. */
export const mergeSegment = crmMergeSegment;

/**
 * Everything about the one call the agent is on: placing it, its live status
 * (socket first, with a Twilio re-sync poll as fallback), mute / hold / end,
 * and the transcript as it is spoken. It lives above the call window, so
 * minimizing, maximizing or navigating to another page never loses it.
 */
export function useCallSession() {
  const [state, setState] = useState<CallSessionState>({ lead: null, ...IDLE });
  const [busy, setBusy] = useState<ControlAction | null>(null);
  const [startCall, { loading: starting }] = useMutation<{ startCrmPortalCall: CrmAiCallResult }>(START_CRM_PORTAL_CALL);
  const [controlCall] = useMutation<{ controlCrmCall: CallControlResult }>(CONTROL_CRM_CALL);

  const live = !!state.logId && !!state.status && !isTerminalCallStatus(state.status);

  useCallSocket((payload) => {
    if (!payload.log_id || payload.log_id !== state.logId) return;
    setState((s) => ({
      ...s,
      status: payload.status ?? s.status,
      answeredAt: payload.answered_at ?? s.answeredAt,
      muted: payload.muted ?? s.muted,
      onHold: payload.on_hold ?? s.onHold,
      error: payload.error_message || s.error,
    }));
  });
  useCallTranscriptSocket((payload) => {
    if (payload.log_id !== state.logId) return;
    const segment: TranscriptSegment = {
      seq: payload.seq,
      speaker: payload.speaker,
      text: payload.text,
      confidence: payload.confidence,
      at: payload.at,
    };
    setState((s) => ({ ...s, segments: mergeSegment(s.segments, segment) }));
  });
  useCallReconcile(live ? state.logId : null, (status: CallStatus) => setState((s) => ({ ...s, status })));

  /** Ready a fresh call for this lead (nothing is dialled until `start`). */
  const prepare = useCallback((lead: CallLead) => setState({ lead, ...IDLE }), []);

  /** Pick a live call back up after a reload, transcript so far included. */
  const restore = useCallback((log: LiveCallLog, lead: CallLead) => {
    setState({
      ...IDLE,
      lead,
      logId: log.id,
      status: log.status as CallStatus,
      answeredAt: log.answered_at ?? null,
      muted: log.muted,
      onHold: log.on_hold,
      segments: log.transcript_segments,
    });
  }, []);

  const clear = useCallback(() => setState({ lead: null, ...IDLE }), []);

  const start = async () => {
    const lead = state.lead;
    if (!lead) return;
    setState((s) => ({ ...IDLE, lead: s.lead }));
    try {
      const res = await startCall({
        variables: { entity_type: lead.entityType, id: lead.entityId, contact_number: lead.to, contact_name: lead.contactName ?? null },
      });
      const payload = res.data?.startCrmPortalCall;
      if (!payload?.ok || !payload.log_id) {
        setState((s) => ({ ...s, error: payload?.message ?? null, errorCode: payload?.code ?? 'UNKNOWN' }));
        return;
      }
      setState((s) => ({ ...s, logId: payload.log_id, status: 'INITIATED' }));
    } catch (err) {
      setState((s) => ({ ...s, error: parseApiError(err), errorCode: 'UNKNOWN' }));
    }
  };

  /** Mute / hold / end. Resolves true when Twilio accepted it. */
  const control = async (action: ControlAction): Promise<boolean> => {
    if (!state.logId) return false;
    setBusy(action);
    try {
      const res = await controlCall({ variables: { log_id: state.logId, action } });
      const result = res.data?.controlCrmCall;
      if (!result?.ok) {
        setState((s) => ({ ...s, error: result?.message ?? null }));
        return false;
      }
      setState((s) => ({ ...s, muted: result.muted, onHold: result.on_hold, error: null }));
      return true;
    } catch (err) {
      setState((s) => ({ ...s, error: parseApiError(err) }));
      return false;
    } finally {
      setBusy(null);
    }
  };

  return { ...state, live, starting, busy, prepare, restore, clear, start, control };
}

export type CallSession = ReturnType<typeof useCallSession>;
