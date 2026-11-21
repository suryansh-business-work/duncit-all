import { communicationLogService } from '@modules/crm/communicationLog/communicationLog.service';
import { logs } from '@observability/log';
import { emitCallStatus } from './call.socket';
import { conferenceName, isTerminalStatus } from './call.twiml';
import { twilioApi, twilioCreds, type TwilioCreds } from './call.config';

export const CALL_ACTIONS = ['MUTE', 'UNMUTE', 'HOLD', 'RESUME', 'END'] as const;
export type CallAction = (typeof CALL_ACTIONS)[number];

export interface CallControlResult {
  ok: boolean;
  message: string;
  log_id: string;
  status: string | null;
  muted: boolean;
  on_hold: boolean;
}

/** Seconds Twilio rings the agent's phone before giving up on it. */
const AGENT_RING_SECONDS = '30';

const str = (value: unknown) => (typeof value === 'string' ? value : '');

/**
 * Ring the agent's phone into the call's conference. Runs when the lead has
 * answered; the agent leg's own status callback (`leg=agent`) hangs the lead
 * up if the agent never picks up, so nobody waits on hold music forever.
 */
export async function addAgentToConference(input: { creds: TwilioCreds; logId: string; userId: string; agent: string }) {
  const { creds, logId, userId, agent } = input;
  const qs = `logId=${logId}&userId=${encodeURIComponent(userId)}&mode=PORTAL&leg=agent`;
  const body = new URLSearchParams({
    From: creds.fromNumber,
    To: agent,
    StartConferenceOnEnter: 'true',
    EndConferenceOnExit: 'true',
    Beep: 'false',
    Timeout: AGENT_RING_SECONDS,
    StatusCallback: `${creds.baseUrl}/twilio/call-status?${qs}`,
    StatusCallbackMethod: 'POST',
  });
  body.append('StatusCallbackEvent', 'completed');
  const res = await twilioApi(creds, `/Conferences/${encodeURIComponent(conferenceName(logId))}/Participants.json`, body);
  if (!res.ok) {
    const message = str(res.json.message) || `Could not ring the agent phone (HTTP ${res.status})`;
    logs.server.warn('twilio', 'agent-leg', { log_id: logId, status: res.status, msg: 'Twilio refused the agent leg' });
    await endCustomerLeg(creds, logId, message);
    return;
  }
  await communicationLogService.update(logId, {
    metadata: { agent_call_sid: str(res.json.call_sid), conference_sid: str(res.json.conference_sid) },
  });
}

/** Hang the lead up and say why on the log (the agent leg failed, or the agent chose End). */
export async function endCustomerLeg(creds: TwilioCreds, logId: string, reason?: string) {
  const log = await communicationLogService.get(logId);
  if (!log?.external_id) return false;
  // A call still ringing can only be cancelled; one in progress is completed.
  const ringing = log.status === 'INITIATED' || log.status === 'RINGING';
  const res = await twilioApi(
    creds,
    `/Calls/${log.external_id}.json`,
    new URLSearchParams({ Status: ringing ? 'canceled' : 'completed' })
  );
  if (reason) await communicationLogService.update(logId, { error_message: reason });
  return res.ok;
}

/** The conference SID, from the log or — when the agent leg's answer had none yet — from Twilio. */
async function conferenceSid(creds: TwilioCreds, logId: string, meta: Record<string, unknown>) {
  if (str(meta.conference_sid)) return str(meta.conference_sid);
  const res = await twilioApi(
    creds,
    `/Conferences.json?FriendlyName=${encodeURIComponent(conferenceName(logId))}&Status=in-progress`
  );
  const list = Array.isArray(res.json.conferences) ? (res.json.conferences as Record<string, unknown>[]) : [];
  const sid = str(list[0]?.sid);
  if (sid) await communicationLogService.update(logId, { metadata: { conference_sid: sid } });
  return sid;
}

async function updateParticipant(creds: TwilioCreds, logId: string, meta: Record<string, unknown>, callSid: string, patch: Record<string, string>) {
  const conference = await conferenceSid(creds, logId, meta);
  if (!conference || !callSid) return false;
  const res = await twilioApi(creds, `/Conferences/${conference}/Participants/${callSid}.json`, new URLSearchParams(patch));
  return res.ok;
}

/**
 * Mute or unmute the agent, put the lead on hold (they hear hold music) or
 * resume, or end the call. Only the agent who placed the call may drive it;
 * the resolver checks that before calling. Mute and hold need the conference
 * bridge, so they are refused on an AI call or a call that has not connected.
 */
export async function controlCall(logId: string, action: CallAction): Promise<CallControlResult> {
  const log = await communicationLogService.get(logId);
  const meta = (await communicationLogService.getMetadata(logId)) ?? {};
  const base = { log_id: logId, status: log?.status ?? null, muted: meta.muted === true, on_hold: meta.on_hold === true };
  if (log?.type !== 'CALL') return { ...base, ok: false, message: 'Not a call' };
  if (isTerminalStatus(log.status)) return { ...base, ok: false, message: 'The call has already ended.' };
  const creds = await twilioCreds();
  if (!creds) return { ...base, ok: false, message: 'Twilio is not configured.' };

  if (action === 'END') {
    const ok = await endCustomerLeg(creds, logId);
    return { ...base, ok, message: ok ? 'Ending the call' : 'Twilio could not end the call. Try again.' };
  }
  if (meta.bridge !== 'CONFERENCE' || log.status !== 'IN_PROGRESS') {
    return { ...base, ok: false, message: 'Mute and hold work once the call is connected.' };
  }

  const muting = action === 'MUTE' || action === 'UNMUTE';
  const ok = muting
    ? await updateParticipant(creds, logId, meta, str(meta.agent_call_sid), { Muted: String(action === 'MUTE') })
    : await updateParticipant(creds, logId, meta, log.external_id ?? '', { Hold: String(action === 'HOLD') });
  if (!ok) return { ...base, ok: false, message: 'Twilio did not accept the change. Try again.' };

  const next = muting ? { muted: action === 'MUTE' } : { on_hold: action === 'HOLD' };
  await communicationLogService.update(logId, { metadata: next });
  const result = { ...base, ...next, ok: true, message: 'Updated' };
  emitCallStatus(log.created_by ?? '', {
    log_id: logId,
    entity_type: log.entity_type,
    entity_id: log.entity_id,
    status: log.status,
    muted: result.muted,
    on_hold: result.on_hold,
  });
  return result;
}
