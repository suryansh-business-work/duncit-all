import type { CallStatus } from '../../lib/callSocket';

export interface CallStatusView {
  /** Localization key for the status label. */
  labelKey: string;
  tone: 'default' | 'info' | 'success' | 'warning' | 'error';
}

const VIEWS: Record<CallStatus, CallStatusView> = {
  INITIATED: { labelKey: 'crm.call.statusConnecting', tone: 'info' },
  RINGING: { labelKey: 'crm.call.statusRinging', tone: 'warning' },
  IN_PROGRESS: { labelKey: 'crm.call.statusInCall', tone: 'success' },
  COMPLETED: { labelKey: 'crm.call.statusOver', tone: 'default' },
  NO_ANSWER: { labelKey: 'crm.call.statusNoAnswer', tone: 'warning' },
  BUSY: { labelKey: 'crm.call.statusBusy', tone: 'warning' },
  FAILED: { labelKey: 'crm.call.statusFailed', tone: 'error' },
};

/** Map a call status (or null = not placed) to a label key + chip tone. */
export function callStatusView(status: CallStatus | null, onHold = false): CallStatusView {
  if (!status) return { labelKey: 'crm.call.statusReady', tone: 'default' };
  if (status === 'IN_PROGRESS' && onHold) return { labelKey: 'crm.call.statusOnHold', tone: 'warning' };
  return VIEWS[status] ?? VIEWS.INITIATED;
}
