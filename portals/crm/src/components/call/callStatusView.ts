import { isTerminalCallStatus, type CallStatus } from '../../lib/callSocket';

export interface CallStatusView {
  label: string;
  tone: 'default' | 'info' | 'success' | 'warning' | 'error';
}

/** Map a call status (or null = not placed) to a display label + chip tone. */
export function callStatusView(status: CallStatus | null): CallStatusView {
  if (!status) return { label: 'Ready', tone: 'default' };
  if (status === 'IN_PROGRESS') return { label: 'In call', tone: 'success' };
  if (status === 'COMPLETED') return { label: 'Call over', tone: 'default' };
  if (status === 'NO_ANSWER') return { label: 'No answer', tone: 'warning' };
  if (status === 'BUSY') return { label: 'Busy', tone: 'warning' };
  if (status === 'FAILED') return { label: 'Failed', tone: 'error' };
  if (status === 'RINGING') return { label: 'Ringing…', tone: 'warning' };
  if (isTerminalCallStatus(status)) return { label: 'Call over', tone: 'default' };
  return { label: 'Connecting…', tone: 'info' };
}
