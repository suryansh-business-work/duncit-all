import { io, type Socket } from 'socket.io-client';
import { urlConfigs } from '../config/url-configs';
import { getToken } from './session';
import { crmIsTerminalCallStatus, type CrmCallStatus } from '@duncit/utils';
import type { CrmLeadEntityType } from '../api/crm.types';

/** Server-emitted call lifecycle event name (matches server CRM_CALL_EVENT). */
export const CRM_CALL_EVENT = 'crm_call_status';

/** The call statuses, shared with the Duncit CRM app (@duncit/utils). */
export type CallStatus = CrmCallStatus;

export interface CallStatusPayload {
  log_id?: string | null;
  external_id?: string | null;
  entity_type?: CrmLeadEntityType | null;
  entity_id?: string | null;
  status: CallStatus;
  direction?: string;
  duration_seconds?: number;
  contact_value?: string | null;
  recording_url?: string | null;
  error_message?: string | null;
  mode?: 'PORTAL' | 'AI';
  /** ISO time the lead picked up — the call clock starts here. */
  answered_at?: string | null;
  muted?: boolean;
  on_hold?: boolean;
  /** Set when the AI summary of a finished call changed state. */
  summary_status?: string;
}

/** Server-emitted event for one finished utterance of a live call (matches server CRM_CALL_TRANSCRIPT_EVENT). */
export const CRM_CALL_TRANSCRIPT_EVENT = 'crm_call_transcript';

export interface CallTranscriptPayload {
  log_id: string;
  seq: number;
  speaker: 'AGENT' | 'LEAD';
  text: string;
  confidence: number | null;
  at: string | null;
}

export const isTerminalCallStatus = crmIsTerminalCallStatus;

/** socket.io server lives at the API origin (graphqlUrl minus the /graphql path). */
const serverOrigin = urlConfigs.graphqlUrl.replace(/\/graphql\/?$/, '');

let socket: Socket | null = null;

/**
 * Lazily creates a single authenticated socket.io connection shared across the
 * CRM. The JWT is read fresh on connect; we reconnect if the token changes so
 * the agent always lands in their own `crm:call:user:<id>` room server-side.
 *
 * Returns null when the user is signed out (no token). Reconnection is capped
 * with a backoff and polling fallback so a down API server doesn't flood the
 * console with endless websocket errors.
 */
export function getCallSocket(): Socket | null {
  const token = getToken();
  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }
  if (socket && (socket.auth as { token?: string })?.token !== token) {
    socket.disconnect();
    socket = null;
  }
  if (!socket) {
    socket = io(serverOrigin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token },
      autoConnect: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      timeout: 8000,
    });
  } else if (!socket.connected) {
    socket.connect();
  }
  return socket;
}
