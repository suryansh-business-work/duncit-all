/**
 * A CRM call on the Twilio call line (Twilio rings the agent's phone, joins
 * the lead in, records and transcribes): its statuses, how each reads, the
 * live transcript and the call clock. Shared by the CRM portal's call window
 * and the Duncit CRM app's call screen, so both say and count the same.
 */
import type { CrmTone } from './crm-quality-labels';

export const CRM_CALL_STATUSES = [
  'INITIATED',
  'RINGING',
  'IN_PROGRESS',
  'COMPLETED',
  'NO_ANSWER',
  'BUSY',
  'FAILED',
] as const;

export type CrmCallStatus = (typeof CRM_CALL_STATUSES)[number];

const isCallStatus = (value: string): value is CrmCallStatus => (CRM_CALL_STATUSES as readonly string[]).includes(value);

/** A status string from the API as a known status, or null when it is not one. */
export const crmToCallStatus = (value: string | null | undefined): CrmCallStatus | null =>
  value && isCallStatus(value) ? value : null;

const TERMINAL = new Set<CrmCallStatus>(['COMPLETED', 'NO_ANSWER', 'BUSY', 'FAILED']);

/** True once the call is over, however it ended. */
export const crmIsTerminalCallStatus = (status: CrmCallStatus): boolean => TERMINAL.has(status);

export interface CrmCallStatusView {
  /** Copy key for the status label. */
  labelKey: string;
  tone: CrmTone;
}

const VIEWS: Record<CrmCallStatus, CrmCallStatusView> = {
  INITIATED: { labelKey: 'crm.call.statusConnecting', tone: 'info' },
  RINGING: { labelKey: 'crm.call.statusRinging', tone: 'warning' },
  IN_PROGRESS: { labelKey: 'crm.call.statusInCall', tone: 'success' },
  COMPLETED: { labelKey: 'crm.call.statusOver', tone: 'default' },
  NO_ANSWER: { labelKey: 'crm.call.statusNoAnswer', tone: 'warning' },
  BUSY: { labelKey: 'crm.call.statusBusy', tone: 'warning' },
  FAILED: { labelKey: 'crm.call.statusFailed', tone: 'error' },
};

/** A status (null = not placed yet) as a label key and a tone; a held call reads "On hold". */
export function crmCallStatusView(status: CrmCallStatus | null, onHold = false): CrmCallStatusView {
  if (!status) return { labelKey: 'crm.call.statusReady', tone: 'default' };
  if (status === 'IN_PROGRESS' && onHold) return { labelKey: 'crm.call.statusOnHold', tone: 'warning' };
  return VIEWS[status] ?? VIEWS.INITIATED;
}

interface SegmentKey {
  seq: number;
  speaker: string;
}

/**
 * Add a transcript segment once (Twilio may send it twice), keeping spoken
 * order. A repeat returns the same array, so React state does not change.
 */
export function crmMergeSegment<T extends SegmentKey>(segments: T[], next: T): T[] {
  if (segments.some((s) => s.seq === next.seq && s.speaker === next.speaker)) return segments;
  return [...segments, next].sort((a, b) => a.seq - b.seq);
}

/** Segments whose text contains the query, case-insensitively; the same array for an empty query. */
export function crmFilterSegments<T extends { text: string }>(segments: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return segments;
  return segments.filter((s) => s.text.toLowerCase().includes(q));
}

/** "m:ss", or "h:mm:ss" past an hour. */
export function crmFormatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = String(s % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

/** Whole seconds since an ISO time (the contact picking up); 0 when there is none yet. */
export function crmElapsedSeconds(since: string | null | undefined, now: number = Date.now()): number {
  const start = since ? Date.parse(since) : Number.NaN;
  return Number.isNaN(start) ? 0 : Math.max(0, Math.floor((now - start) / 1000));
}

/** True when the call line is configured, both numbers are known and the contact has a number. */
export const crmCanStartCall = (
  setup: { configured: boolean; from_number?: string | null; agent_number?: string | null } | null | undefined,
  to: string | null | undefined,
): boolean => !!setup?.configured && !!setup.from_number && !!setup.agent_number && !!to?.trim();
