import { CONTACT_KEY_MIN_DIGITS, phoneKey } from '@duncit/utils';
import { CALL_TYPE, type CallLogEntry, type DirectoryMatch } from 'crm-telephony';

import { isLeadKind, type LeadKind } from '@/features/leads/leadKinds';

/**
 * Which phone calls become CRM communication logs, and how each is described.
 * Pure: the sync service feeds it the phone's call log and the offline CRM
 * directory, and sends only what this returns.
 */

export type CallDirection = 'INBOUND' | 'OUTBOUND';
export type CallOutcome = 'COMPLETED' | 'NO_ANSWER' | 'BUSY' | 'FAILED';

export interface PlannedCall {
  /** Install id + call log row: what makes a re-sent report a no-op on the server. */
  clientCallId: string;
  entry: CallLogEntry;
  lead: DirectoryMatch;
  /** The lead's kind, checked: a directory row with a kind the API does not know is never sent. */
  entityType: LeadKind;
  direction: CallDirection;
  outcome: CallOutcome;
  startedAt: string;
}

/** The comparable form of a number — the server's rule — or '' when it cannot identify anyone. */
export function callKey(raw: string | null | undefined): string {
  const key = phoneKey(String(raw ?? ''));
  return key.length >= CONTACT_KEY_MIN_DIGITS ? key : '';
}

/** Voicemail and blocked calls are not conversations with a lead. */
export function directionOf(type: number): CallDirection | null {
  if (type === CALL_TYPE.OUTGOING) return 'OUTBOUND';
  if (type === CALL_TYPE.INCOMING || type === CALL_TYPE.MISSED || type === CALL_TYPE.REJECTED)
    return 'INBOUND';
  return null;
}

/** A call that ran is COMPLETED; one that never connected was not answered. */
export function outcomeOf(entry: Pick<CallLogEntry, 'type' | 'durationSeconds'>): CallOutcome {
  if (
    entry.durationSeconds > 0 &&
    entry.type !== CALL_TYPE.MISSED &&
    entry.type !== CALL_TYPE.REJECTED
  )
    return 'COMPLETED';
  return 'NO_ANSWER';
}

/** The report for one call log row with a CRM contact, or null when it is not one to report. */
export function planCall(
  entry: CallLogEntry,
  lead: DirectoryMatch | null,
  installId: string,
): PlannedCall | null {
  if (!lead || !isLeadKind(lead.entityType) || !callKey(entry.number)) return null;
  const direction = directionOf(entry.type);
  if (!direction) return null;
  return {
    clientCallId: `${installId}:${entry.id}`,
    entry,
    lead,
    entityType: lead.entityType,
    direction,
    outcome: outcomeOf(entry),
    startedAt: new Date(entry.date).toISOString(),
  };
}
