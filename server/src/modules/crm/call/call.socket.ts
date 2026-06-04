import { getIo, type AuthedSocket } from '@realtime/io';

/**
 * Real-time channel for CRM softphone / AI calls. Each agent lands in their own
 * `crm:call:user:<id>` room on connect, so call-lifecycle events (RINGING,
 * IN_PROGRESS, COMPLETED, …) emitted from the Twilio status-callback webhook
 * reach the exact agent who placed the call — letting the CRM mark a call
 * "over" the moment Twilio reports it ended.
 */
export const crmCallUserRoom = (userId: string) => `crm:call:user:${userId}`;

export const CRM_CALL_EVENT = 'crm_call_status';

export function attachCallHandlers() {
  const io = getIo();
  io.on('connection', (socket: AuthedSocket) => {
    if (!socket.userId) return;
    socket.join(crmCallUserRoom(socket.userId));
  });
}

export interface CrmCallStatusPayload {
  log_id?: string | null;
  external_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  status: string;
  direction?: string;
  duration_seconds?: number;
  contact_value?: string | null;
  recording_url?: string | null;
  error_message?: string | null;
  mode?: 'PORTAL' | 'AI';
}

/** Emit a call-status update to the agent who owns the call. */
export function emitCallStatus(userId: string, payload: CrmCallStatusPayload) {
  if (!userId) return;
  try {
    getIo().to(crmCallUserRoom(userId)).emit(CRM_CALL_EVENT, payload);
  } catch {
    // Socket server not initialised yet (seed scripts) — safe to skip.
  }
}
