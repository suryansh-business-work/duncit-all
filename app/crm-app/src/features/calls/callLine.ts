import { crmMergeSegment, crmToCallStatus, type CrmCallStatus } from '@duncit/utils';

import type { LeadKind } from '@/features/leads/leadKinds';

/** The lead a call-line call is for, as the lead page or the dialer knows it. */
export interface CallLead {
  /** The contact's number, as stored on the lead. */
  to: string;
  kind: LeadKind;
  leadId: string;
  leadName: string;
  contactName?: string;
}

/** Whether a call-line call can be placed, and from which numbers (crmCallSetup). */
export interface CallSetup {
  configured: boolean;
  missing: string[];
  from_number?: string | null;
  agent_number?: string | null;
  recording_enabled: boolean;
  live_transcription: boolean;
  can_configure: boolean;
}

export type ControlAction = 'MUTE' | 'UNMUTE' | 'HOLD' | 'RESUME' | 'END';

export interface TranscriptLine {
  seq: number;
  speaker: string;
  text: string;
  at?: string | null;
}

export interface CallState {
  logId: string | null;
  status: CrmCallStatus | null;
  /** ISO time the contact picked up. */
  answeredAt: string | null;
  muted: boolean;
  onHold: boolean;
  segments: TranscriptLine[];
  error: string | null;
  /** The server's reason when the call was not placed (e.g. TWILIO_NOT_CONFIGURED). */
  errorCode: string | null;
  /** The last status check failed; the next one is still coming. */
  connectionLost: boolean;
}

export const IDLE_CALL: CallState = {
  logId: null,
  status: null,
  answeredAt: null,
  muted: false,
  onHold: false,
  segments: [],
  error: null,
  errorCode: null,
  connectionLost: false,
};

/** The agent's live call as `myActiveCrmCall` returns it. */
export interface ActiveCall {
  id: string;
  entity_id: string;
  status: string;
  answered_at?: string | null;
  muted: boolean;
  on_hold: boolean;
  transcript_segments: TranscriptLine[];
}

/** A live call picked back up (the app was closed, or the screen reopened), transcript so far included. */
export function restoredCall(active: ActiveCall): CallState {
  return {
    ...IDLE_CALL,
    logId: active.id,
    status: crmToCallStatus(active.status) ?? 'INITIATED',
    answeredAt: active.answered_at ?? null,
    muted: active.muted,
    onHold: active.on_hold,
    segments: active.transcript_segments,
  };
}

/**
 * One status check folded into the call: Twilio's re-synced status wins, and
 * while the call is still the agent's live call its pick-up time, mute, hold
 * and new transcript lines come in too.
 */
export function applyStatusCheck(
  state: CallState,
  reconciled: string | null | undefined,
  active: ActiveCall | null | undefined,
): CallState {
  const next: CallState = { ...state, connectionLost: false };
  const ours = active?.id === state.logId ? active : null;
  next.status = crmToCallStatus(reconciled) ?? crmToCallStatus(ours?.status) ?? state.status;
  if (!ours) return next;
  return {
    ...next,
    answeredAt: ours.answered_at ?? state.answeredAt,
    muted: ours.muted,
    onHold: ours.on_hold,
    segments: ours.transcript_segments.reduce(
      (all, line) => crmMergeSegment(all, line),
      state.segments,
    ),
  };
}
