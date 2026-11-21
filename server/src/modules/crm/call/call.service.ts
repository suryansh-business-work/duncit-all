import { communicationLogService } from '@modules/crm/communicationLog/communicationLog.service';
import type { CommsLogEntity } from '@modules/crm/communicationLog/communicationLog.model';
import { callPromptService } from '@modules/crm/callPrompt/callPrompt.service';
import { servamService } from '@services/servam/servam.service';
import { openaiService, type OpenAiChatTurn } from '@services/openai/openai.service';
import { emitCallStatus } from './call.socket';
import { audioCache } from './audioCache';
import { toE164, defaultDialCode, isValidPhone } from './phone';
import { buildAiPlayGatherTwiml, buildSayHangupTwiml, mapTwilioStatus, isTerminalStatus } from './call.twiml';
import { resolveAgentNumber, twilioApi, twilioCreds, type TwilioCreds } from './call.config';

/**
 * Why a call was not placed, for the portal to act on (for example, a
 * "Configure Twilio" link for TWILIO_NOT_CONFIGURED). The message stays the
 * human-readable reason for older clients that only read it.
 */
export type CallErrorCode =
  | 'TWILIO_NOT_CONFIGURED'
  | 'NO_AGENT_NUMBER'
  | 'INVALID_AGENT_NUMBER'
  | 'INVALID_CONTACT_NUMBER'
  | 'PROMPT_MISSING'
  | 'TWILIO_REJECTED';

const NOT_CONFIGURED = 'Twilio is not configured. Set the TWILIO account SID, auth token and phone number in the Tech portal.';

const refused = (code: CallErrorCode, message: string) => ({ ok: false, message, log: null, code });

const invalidContact = (to: string) =>
  refused(
    'INVALID_CONTACT_NUMBER',
    `The customer number (${to || 'empty'}) is not a valid phone number. Fix the lead's contact mobile and try again.`
  );

const twilioMessage = (json: Record<string, unknown>) => (typeof json.message === 'string' ? json.message : '');

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : '');

function statusCallbackEvents(body: URLSearchParams) {
  for (const e of ['initiated', 'ringing', 'answered', 'completed']) body.append('StatusCallbackEvent', e);
}

/**
 * Hand the prepared call to Twilio. The log already exists, so a refused or
 * failed dial is recorded as FAILED rather than silently missing from the CRM.
 */
async function dial(creds: TwilioCreds, body: URLSearchParams, logId: string, placedMessage: string) {
  try {
    const { ok, status, json } = await twilioApi(creds, '/Calls.json', body);
    if (!ok) {
      await communicationLogService.update(logId, { status: 'FAILED', error_message: twilioMessage(json) || 'Twilio call failed' });
      return refused('TWILIO_REJECTED', twilioMessage(json) || `Twilio call failed (HTTP ${status})`);
    }
    const updated = await communicationLogService.update(logId, { external_id: String(json.sid ?? '') });
    return { ok: true, message: placedMessage, log: updated, code: null };
  } catch (err) {
    await communicationLogService.update(logId, { status: 'FAILED', error_message: errorMessage(err) || 'Call failed' });
    return refused('TWILIO_REJECTED', errorMessage(err) || 'Twilio call request failed');
  }
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
    if (!prompt) return refused('PROMPT_MISSING', 'Selected AI prompt is missing or inactive.');

    const creds = await twilioCreds();
    if (!creds) return refused('TWILIO_NOT_CONFIGURED', NOT_CONFIGURED);
    const to = toE164(input.to, await defaultDialCode());
    if (!isValidPhone(to)) return invalidContact(to);

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
      metadata: {
        mode: 'AI',
        prompt_id: prompt.id,
        voice: input.voice ?? '',
        user_id: input.user_id,
        from_number: creds.fromNumber,
        ai_history: [],
      },
    });

    const qs = `logId=${log.id}&userId=${encodeURIComponent(input.user_id)}`;
    const body = new URLSearchParams({
      To: to,
      From: creds.fromNumber,
      Url: `${creds.baseUrl}/twilio/voice/ai?${qs}`,
      Method: 'POST',
      StatusCallback: `${creds.baseUrl}/twilio/call-status?${qs}&mode=AI`,
      StatusCallbackMethod: 'POST',
    });
    statusCallbackEvents(body);
    return dial(creds, body, log.id, `AI call placed to ${to}`);
  },

  /**
   * Normal portal call: Twilio dials the customer (From = config number); once
   * they answer, both the customer and the agent's phone join one conference,
   * which is what lets the portal mute, hold and end the call. Pure two-way, no AI.
   */
  async startPortalCall(input: {
    entity_type: CommsLogEntity;
    entity_id: string;
    to: string;
    agent_number?: string | null;
    contact_name?: string | null;
    user_id: string;
  }) {
    const creds = await twilioCreds();
    if (!creds) return refused('TWILIO_NOT_CONFIGURED', NOT_CONFIGURED);
    // Predefined Twilio-config agent number (or the agent's profile phone).
    const typed = (input.agent_number ?? '').trim();
    const agent = typed ? toE164(typed, await defaultDialCode()) : (await resolveAgentNumber(input.user_id))?.number;
    if (!agent) {
      return refused('NO_AGENT_NUMBER', 'No agent number configured. Set "Agent Phone Number" on the TWILIO entry in the Tech portal.');
    }
    if (!isValidPhone(agent)) {
      return refused(
        'INVALID_AGENT_NUMBER',
        `The configured agent number (${agent}) is not valid. Fix "Agent Phone Number" on the TWILIO entry in the Tech portal.`
      );
    }
    const to = toE164(input.to, await defaultDialCode());
    if (!isValidPhone(to)) return invalidContact(to);

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
      metadata: { mode: 'PORTAL', bridge: 'CONFERENCE', user_id: input.user_id, from_number: creds.fromNumber, agent_number: agent },
    });

    // Dial the CUSTOMER first (From = config number) — the same leg the AI call
    // uses and which is proven to ring — then bring the agent in when answered.
    const qs = `logId=${log.id}&userId=${encodeURIComponent(input.user_id)}`;
    const body = new URLSearchParams({
      To: to,
      From: creds.fromNumber,
      Url: `${creds.baseUrl}/twilio/voice/portal?${qs}&agent=${encodeURIComponent(agent)}`,
      Method: 'POST',
      StatusCallback: `${creds.baseUrl}/twilio/call-status?${qs}&mode=PORTAL`,
      StatusCallbackMethod: 'POST',
    });
    statusCallbackEvents(body);
    return dial(creds, body, log.id, `Calling ${to} — you'll be bridged in when they answer`);
  },

  /**
   * Re-sync a non-terminal call from Twilio. Fallback for when the async status
   * callback never reaches us (missed webhook / unreachable host), so a call
   * that the customer already cut stops showing as INITIATED in the CRM.
   */
  async reconcile(logId: string) {
    const log = await communicationLogService.get(logId);
    if (log?.type !== 'CALL') return { ok: false, message: 'Not a call', status: null };
    if (isTerminalStatus(log.status)) return { ok: true, message: 'Already ended', status: log.status, terminal: true };
    const sid = log.external_id;
    if (!sid) return { ok: false, message: 'No call id yet', status: log.status };
    const creds = await twilioCreds();
    if (!creds) return { ok: false, message: 'Twilio not configured', status: log.status };
    try {
      const { ok, json } = await twilioApi(creds, `/Calls/${sid}.json`);
      if (!ok || !json.status) return { ok: false, message: 'Could not fetch status', status: log.status };
      const applied = await this.applyStatus({
        log_id: logId,
        user_id: log.created_by ?? '',
        twilio_status: String(json.status),
        duration_seconds: Number(json.duration || 0) || undefined,
      });
      return { ok: true, message: 'Synced', status: applied.status, terminal: applied.terminal };
    } catch (err) {
      return { ok: false, message: errorMessage(err) || 'Reconcile failed', status: log.status };
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

    if (input.speech?.trim()) history.push({ role: 'user', content: input.speech.trim() });
    // Brain = OpenAI agent; voice = Servam TTS; carrier = Twilio.
    const chat = await openaiService.chat({ systemContext: prompt.context, history });
    // Switched off mid-call: end politely instead of looping "please repeat" for 24 turns.
    if (chat.disabled) return buildSayHangupTwiml('Sorry, our assistant is unavailable right now. We will call you back. Goodbye.');
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
    const patch: Parameters<typeof communicationLogService.update>[1] = { status };
    if (input.duration_seconds != null) patch.duration_seconds = input.duration_seconds;
    if (input.recording_url) patch.recording_url = input.recording_url;
    if (input.error_message) patch.error_message = input.error_message;
    // The first time the lead picks up starts the call clock the portal shows,
    // including after a reload; later polls of the same status leave it alone.
    if (status === 'IN_PROGRESS') {
      const meta = await communicationLogService.getMetadata(input.log_id);
      if (meta && !meta.answered_at) patch.metadata = { answered_at: new Date().toISOString() };
    }
    const updated = await communicationLogService.update(input.log_id, patch);
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
      answered_at: updated?.answered_at ?? null,
      mode: input.mode,
    });
    return { status, terminal: isTerminalStatus(status), log: updated };
  },
};
