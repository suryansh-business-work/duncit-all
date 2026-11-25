/**
 * A CRM lead's Communications tab: how each call or email status reads, where
 * a call's transcript stands, the AI summary's sentiment and the filter counts.
 * Shared by the CRM portal's log and the Duncit CRM app's, so both say the same.
 */
import type { CrmTone } from './crm-quality-labels';

export const CRM_COMMS_STATUS_TONE: Readonly<Record<string, CrmTone>> = {
  SENT: 'success',
  DELIVERED: 'success',
  COMPLETED: 'success',
  INITIATED: 'info',
  IN_PROGRESS: 'info',
  RINGING: 'info',
  QUEUED: 'default',
  FAILED: 'error',
  NO_ANSWER: 'warning',
  BUSY: 'warning',
};

/** A log status's tone; anything new reads neutral. */
export const crmCommsStatusTone = (status: string): CrmTone => CRM_COMMS_STATUS_TONE[status] ?? 'default';

export const CRM_COMMS_FILTERS = ['ALL', 'EMAIL', 'CALL'] as const;
export type CrmCommsFilter = (typeof CRM_COMMS_FILTERS)[number];

/** How many of the loaded logs are emails and how many are calls. */
export function crmCommsTypeCounts(logs: readonly { type: string }[]): { EMAIL: number; CALL: number } {
  const counts = { EMAIL: 0, CALL: 0 };
  for (const log of logs) if (log.type === 'EMAIL' || log.type === 'CALL') counts[log.type] += 1;
  return counts;
}

export interface CrmCallTranscriptLike {
  transcript?: string | null;
  transcript_status: string;
  recording_url?: string | null;
  transcript_segments?: readonly unknown[] | null;
}

/** A call has something to read: a finished transcript or live segments. */
export const crmCallHasTranscript = (log: CrmCallTranscriptLike): boolean =>
  (log.transcript_status === 'READY' && Boolean(log.transcript)) || (log.transcript_segments?.length ?? 0) > 0;

/** Where a call without a transcript stands. */
export function crmTranscriptLabelKey(log: CrmCallTranscriptLike): string {
  if (log.transcript_status === 'PENDING') return 'crm.call.transcriptPending';
  if (log.transcript_status === 'FAILED') return 'crm.call.transcriptFailed';
  if (log.recording_url) return 'crm.call.transcriptNotRequested';
  return 'crm.call.noRecordingYet';
}

export const CRM_CALL_SENTIMENT: Readonly<Record<string, { labelKey: string; tone: CrmTone }>> = {
  POSITIVE: { labelKey: 'crm.call.sentimentPOSITIVE', tone: 'success' },
  NEUTRAL: { labelKey: 'crm.call.sentimentNEUTRAL', tone: 'default' },
  NEGATIVE: { labelKey: 'crm.call.sentimentNEGATIVE', tone: 'error' },
  MIXED: { labelKey: 'crm.call.sentimentMIXED', tone: 'warning' },
};
