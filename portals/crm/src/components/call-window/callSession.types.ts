import type { CrmLeadEntityType } from '../../api/crm.types';
import type { TranscriptSegment } from '../../api/call.gql';
import type { CallStatus } from '../../lib/callSocket';

/** The lead a call is for, as the lead page knows it. */
export interface CallLead {
  /** The contact's number, as stored on the lead. */
  to: string;
  entityType: CrmLeadEntityType;
  entityId: string;
  displayName: string;
  contactName?: string;
}

export type ControlAction = 'MUTE' | 'UNMUTE' | 'HOLD' | 'RESUME' | 'END';

export interface CallSessionState {
  lead: CallLead | null;
  logId: string | null;
  status: CallStatus | null;
  /** ISO time the contact picked up. */
  answeredAt: string | null;
  muted: boolean;
  onHold: boolean;
  segments: TranscriptSegment[];
  error: string | null;
  /** The server's reason code when the call was not placed (e.g. TWILIO_NOT_CONFIGURED). */
  errorCode: string | null;
}
