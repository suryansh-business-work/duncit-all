import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { communicationLogService } from '@modules/crm/communicationLog/communicationLog.service';
import type { CommsLogEntity } from '@modules/crm/communicationLog/communicationLog.model';
import { callPromptService } from '@modules/crm/callPrompt/callPrompt.service';
import { servamService } from '@services/servam/servam.service';
import { openaiService, type OpenAiChatTurn } from '@services/openai/openai.service';
import { UserModel } from '@modules/access/user/user.model';
import { emitCallStatus } from './call.socket';
import { audioCache } from './audioCache';
import { getWebhookBaseUrl } from './webhookBase';
import { toE164, defaultDialCode, isValidPhone } from './phone';
import { buildAiPlayGatherTwiml, buildSayHangupTwiml, mapTwilioStatus, isTerminalStatus } from './call.twiml';

/**
 * Agent leg for portal calls: the predefined number from the Twilio config
 * (`agent_phone_number` on the TWILIO entry) is used first; the logged-in
 * user's own profile phone is the fallback. Twilio rings this number and
 * bridges it to the customer so the agent talks to the lead.
 */
async function resolveAgentNumber(userId: string): Promise<string | null> {
  const candidates: string[] = [];
  const configured = (await getRuntimeEnvValue('TWILIO_AGENT_PHONE_NUMBER')).trim();
  if (configured) candidates.push(toE164(configured));
  try {
    const u: any = await UserModel.findById(userId).lean();
    const ph = u?.auth?.phone;
    if (ph?.number) candidates.push(toE164(String(ph.number), String(ph.extension || '+91')));
  } catch {
    /* no profile phone */
  }
  // First *valid* number wins, so a placeholder config (+00000000) doesn't block
  // a real profile number.
  return candidates.find(isValidPhone) ?? candidates[0] ?? null;
}

interface TwilioCreds {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  baseUrl: string;
}

async function twilioCreds(): Promise<TwilioCreds | null> {
  const [accountSid, authToken, fromNumber] = await Promise.all([
    getRuntimeEnvValue('TWILIO_ACCOUNT_SID'),
    getRuntimeEnvValue('TWILIO_AUTH_TOKEN'),
    getRuntimeEnvValue('TWILIO_PHONE_NUMBER'),
  ]);
  if (!accountSid || !authToken || !fromNumber) return null;
  // Webhook base URL is derived internally from the server host, not env.
  const baseUrl = await getWebhookBaseUrl();
  return { accountSid, authToken, fromNumber, baseUrl };
}

async function placeCall(creds: TwilioCreds, body: URLSearchParams) {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Calls.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const json: any = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

function statusCallbackEvents(body: URLSearchParams) {
  for (const e of ['initiated', 'ringing', 'answered', 'completed']) body.append('StatusCallbackEvent', e);
}

const GOODBYE = /\b(bye|goodbye|thank you|thanks|alvida|dhanyavaad|theek hai bye)\b/i;

export const callService = {
  /** Place an outbound AI call: Twilio dials the customer; /voice/ai drives the Servam chat + voice. */
  async startAiCall(input: {
    entity_type: CommsLogEntity;
    entity_id: string;
    to: string;
    prompt_id: string;
    voice?: string | null;
    contact_name?: string | null;
    user_id: string;
  }) {
    const prompt = await callPromptService.resolveContext(input.prompt_id);
    if (!prompt) return { ok: false, message: 'Selected AI prompt is missing or inactive.', log: null };

    const creds = await twilioCreds();
    if (!creds) {
      return { ok: false, message: 'Twilio is not configured. Set the TWILIO account SID, auth token and phone number in the Tech portal.', log: null };
    }
    const to = toE164(input.to, await defaultDialCode());
    if (!isValidPhone(to)) {
      return { ok: false, message: `The customer number (${to || 'empty'}) is not a valid phone number. Fix the lead's contact mobile and try again.`, log: null };
    }

    const log = await communicationLogService.create({
      type: 'CALL',
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      contact_name: input.contact_name ?? '',
      contact_value: to,
      subject: `AI Call · ${prompt.name}`,
      status: 'INITIATED',
      provider_name: 'servam',
      created_by: input.user_id,
      metadata: { mode: 'AI', prompt_id: prompt.id, voice: input.voice ?? '', user_id: input.user_id, ai_history: [] },
    });

    const qs = `logId=${log!.id}&userId=${encodeURIComponent(input.user_id)}`;
    const body = new URLSearchParams({
      To: to,
      From: creds.fromNumber,
      Url: `${creds.baseUrl}/twilio/voice/ai?${qs}`,
      Method: 'POST',
      StatusCallback: `${creds.baseUrl}/twilio/call-status?${qs}&mode=AI`,
      StatusCallbackMethod: 'POST',
    });
    statusCallbackEvents(body);

    try {
      const { ok, status, json } = await placeCall(creds, body);
      if (!ok) {
        await communicationLogService.update(log!.id, { status: 'FAILED', error_message: json?.message || 'Twilio call failed' });
        return { ok: false, message: json?.message || `Twilio call failed (HTTP ${status})`, log: null };
      }
      const updated = await communicationLogService.update(log!.id, { external_id: String(json?.sid ?? '') });
      return { ok: true, message: `AI call placed to ${to}`, log: updated ?? log };
    } catch (err: any) {
      await communicationLogService.update(log!.id, { status: 'FAILED', error_message: err?.message || 'Call failed' });
      return { ok: false, message: err?.message || 'Twilio call request failed', log: null };
    }
  },

  /** Normal portal call: Twilio dials the customer (From = config number), then bridges in the agent. Pure two-way, no AI. */
  async startPortalCall(input: {
    entity_type: CommsLogEntity;
    entity_id: string;
    to: string;
    agent_number?: string | null;
    contact_name?: string | null;
    user_id: string;
  }) {
    const creds = await twilioCreds();
    if (!creds) {
      return { ok: false, message: 'Twilio is not configured. Set the TWILIO account SID, auth token and phone number in the Tech portal.', log: null };
    }
    // Predefined Twilio-config agent number (or the agent's profile phone).
    const typed = (input.agent_number ?? '').trim();
    const agent = typed ? toE164(typed, await defaultDialCode()) : await resolveAgentNumber(input.user_id);
    if (!agent) {
      return { ok: false, message: 'No agent number configured. Set "Agent Phone Number" on the TWILIO entry in the Tech portal.', log: null };
    }
    if (!isValidPhone(agent)) {
      return { ok: false, message: `The configured agent number (${agent}) is not valid. Fix "Agent Phone Number" on the TWILIO entry in the Tech portal.`, log: null };
    }
    const to = toE164(input.to, await defaultDialCode());
    if (!isValidPhone(to)) {
      return { ok: false, message: `The customer number (${to || 'empty'}) is not a valid phone number. Fix the lead's contact mobile and try again.`, log: null };
    }

    const log = await communicationLogService.create({
      type: 'CALL',
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      contact_name: input.contact_name ?? '',
      contact_value: to,
      subject: 'Portal Call',
      status: 'INITIATED',
      provider_name: 'twilio',
      created_by: input.user_id,
      metadata: { mode: 'PORTAL', user_id: input.user_id },
    });

    // Dial the CUSTOMER first (From = config number) — the same leg the AI call
    // uses and which is proven to ring — then bridge the agent when answered.
    const qs = `logId=${log!.id}&userId=${encodeURIComponent(input.user_id)}`;
    const body = new URLSearchParams({
      To: to,
      From: creds.fromNumber,
      Url: `${creds.baseUrl}/twilio/voice/portal?${qs}&agent=${encodeURIComponent(agent)}`,
      Method: 'POST',
      StatusCallback: `${creds.baseUrl}/twilio/call-status?${qs}&mode=PORTAL`,
      StatusCallbackMethod: 'POST',
    });
    statusCallbackEvents(body);

    try {
      const { ok, status, json } = await placeCall(creds, body);
      if (!ok) {
        await communicationLogService.update(log!.id, { status: 'FAILED', error_message: json?.message || 'Twilio call failed' });
        return { ok: false, message: json?.message || `Twilio call failed (HTTP ${status})`, log: null };
      }
      const updated = await communicationLogService.update(log!.id, { external_id: String(json?.sid ?? '') });
      return { ok: true, message: `Calling ${to} — you'll be bridged in when they answer`, log: updated ?? log };
    } catch (err: any) {
      await communicationLogService.update(log!.id, { status: 'FAILED', error_message: err?.message || 'Call failed' });
      return { ok: false, message: err?.message || 'Twilio call request failed', log: null };
    }
  },

  /**
   * Re-sync a non-terminal call from Twilio. Fallback for when the async status
   * callback never reaches us (missed webhook / unreachable host), so a call
   * that the customer already cut stops showing as INITIATED in the CRM.
   */
  async reconcile(logId: string) {
    const log = await communicationLogService.get(logId);
    if (!log || log.type !== 'CALL') return { ok: false, message: 'Not a call', status: null };
    if (isTerminalStatus(log.status)) return { ok: true, message: 'Already ended', status: log.status, terminal: true };
    const sid = log.external_id;
    if (!sid) return { ok: false, message: 'No call id yet', status: log.status };
    const creds = await twilioCreds();
    if (!creds) return { ok: false, message: 'Twilio not configured', status: log.status };
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Calls/${sid}.json`, {
        headers: { Authorization: 'Basic ' + Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64') },
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok || !json?.status) return { ok: false, message: 'Could not fetch status', status: log.status };
      const applied = await this.applyStatus({
        log_id: logId,
        user_id: log.created_by ?? '',
        twilio_status: String(json.status),
        duration_seconds: Number(json.duration || 0) || undefined,
      });
      return { ok: true, message: 'Synced', status: applied.status, terminal: applied.terminal };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Reconcile failed', status: log.status };
    }
  },

  /** Synthesize a Servam-voiced line and return a Twilio-playable audio URL. */
  async synthAudioUrl(text: string, voice: string | undefined, language: string | undefined, baseUrl: string): Promise<string | null> {
    const tts = await servamService.tts({ text, voice, language });
    if (!tts.ok || !tts.audio) return null;
    const token = audioCache.put(tts.audio, tts.contentType);
    return `${baseUrl}/twilio/ai-audio/${token}`;
  },

  /** Build the next TwiML turn of an AI call from the customer's speech. */
  async handleAiTurn(input: { log_id: string; speech?: string | null; base_url: string }): Promise<string> {
    const meta = (await communicationLogService.getMetadata(input.log_id)) ?? {};
    const promptId = meta.prompt_id as string | undefined;
    const voice = (meta.voice as string | undefined) || undefined;
    const prompt = promptId ? await callPromptService.resolveContext(promptId) : null;
    const history: OpenAiChatTurn[] = Array.isArray(meta.ai_history) ? meta.ai_history : [];

    const actionUrl = `${input.base_url}/twilio/voice/ai?logId=${input.log_id}`;
    if (!prompt) return buildSayHangupTwiml('Sorry, this call could not be set up. Goodbye.');

    if (input.speech && input.speech.trim()) history.push({ role: 'user', content: input.speech.trim() });
    // Brain = OpenAI agent; voice = Servam TTS; carrier = Twilio.
    const chat = await openaiService.chat({ systemContext: prompt.context, history });
    const reply = chat.ok && chat.reply ? chat.reply : 'I am sorry, could you please repeat that?';
    history.push({ role: 'assistant', content: reply });
    await communicationLogService.update(input.log_id, { metadata: { ai_history: history } });

    const hangup = GOODBYE.test(input.speech ?? '') || history.length > 24;
    const audioUrl = await this.synthAudioUrl(reply, voice, prompt.language, input.base_url);
    if (!audioUrl) return buildSayHangupTwiml(reply); // TTS down — fall back to Twilio voice.
    return buildAiPlayGatherTwiml({ audioUrl, actionUrl, language: prompt.language, hangup });
  },

  /** Apply a Twilio status/dial callback to the log and push it to the agent live. */
  async applyStatus(input: {
    log_id: string;
    user_id: string;
    twilio_status: string;
    duration_seconds?: number;
    recording_url?: string | null;
    error_message?: string | null;
    mode?: 'PORTAL' | 'AI';
  }) {
    const status = mapTwilioStatus(input.twilio_status);
    const patch: Record<string, unknown> = { status };
    if (input.duration_seconds != null) patch.duration_seconds = input.duration_seconds;
    if (input.recording_url) patch.recording_url = input.recording_url;
    if (input.error_message) patch.error_message = input.error_message;
    const updated = await communicationLogService.update(input.log_id, patch as any);
    emitCallStatus(input.user_id, {
      log_id: input.log_id,
      external_id: updated?.external_id ?? null,
      entity_type: updated?.entity_type ?? null,
      entity_id: updated?.entity_id ?? null,
      status,
      direction: updated?.direction ?? 'OUTBOUND',
      duration_seconds: updated?.duration_seconds ?? 0,
      contact_value: updated?.contact_value ?? null,
      recording_url: updated?.recording_url ?? null,
      error_message: updated?.error_message ?? null,
      mode: input.mode,
    });
    return { status, terminal: isTerminalStatus(status), log: updated };
  },
};
