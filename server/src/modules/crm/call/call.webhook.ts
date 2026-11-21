import { Router, type Request, type Response } from 'express';
import express from 'express';
import { communicationLogService } from '@modules/crm/communicationLog/communicationLog.service';
import { logs } from '@observability/log';
import { callService } from './call.service';
import { audioCache } from './audioCache';
import { emitCallStatus } from './call.socket';
import { getWebhookBaseUrl } from './webhookBase';
import { buildPortalConferenceTwiml, buildSayHangupTwiml, conferenceName } from './call.twiml';
import { requireTwilioSignature } from './twilioWebhookGuard';
import { callMediaSettings, twilioCreds } from './call.config';
import { addAgentToConference, endCustomerLeg } from './call.conference';
import { handleTranscriptionEvent } from './call.transcription';
import { summarizeCallInBackground } from './call.summary';

const xml = (res: Response, body: string) => res.type('text/xml').send(body);
const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

/** Agent-leg outcomes that mean the agent never got on the call. */
const AGENT_MISSED = new Set(['busy', 'no-answer', 'failed', 'canceled']);

/**
 * The agent's phone never joined (busy, unanswered, failed): hang the lead up
 * instead of leaving them on hold music, and say why on the log.
 */
async function handleAgentLegStatus(logId: string, callStatus: string) {
  if (!AGENT_MISSED.has(callStatus.toLowerCase())) return;
  const creds = await twilioCreds();
  if (creds) await endCustomerLeg(creds, logId, `The agent phone did not join the call (${callStatus}).`);
}

/** Servam transcript of the recording, then the AI summary — for calls with no live transcript. */
function transcribeRecordingInBackground(logId: string) {
  communicationLogService
    .requestTranscript(logId)
    .then((log) => {
      if (log?.transcript_status === 'READY') summarizeCallInBackground(logId);
    })
    .catch((error: unknown) => {
      logs.server.error('crm', 'call-transcript', { error, log_id: logId, msg: 'Recording transcript failed' });
    });
}

/**
 * Twilio Voice webhooks for CRM calls (Servam-voiced). Mounted under `/twilio`.
 * Twilio posts application/x-www-form-urlencoded, so the router parses that.
 * Every POST must carry Twilio's signature over the URL built from
 * `getWebhookBaseUrl` (the base every callback handed to Twilio uses): an
 * unsigned call-status could rewrite any call log, and an unsigned voice hit
 * would dial an agent or run paid AI turns for anyone.
 */
export function buildCallWebhookRouter(): Router {
  const router = Router();
  router.use(express.urlencoded({ extended: false }));
  const signed = (route: string) => requireTwilioSignature(route, getWebhookBaseUrl);

  // Portal call: the customer answered → they join the call's conference and
  // the agent's phone is rung into it (plain Twilio <Say>, no Servam
  // dependency, so a normal call can't fail on TTS).
  router.post('/voice/portal', signed('voice-portal'), async (req: Request, res: Response) => {
    const logId = String(req.query.logId || '').trim();
    const userId = String(req.query.userId || '').trim();
    const agent = String(req.query.agent || '').trim();
    if (!agent || !logId) return xml(res, buildSayHangupTwiml('No agent number to connect. Goodbye.'));
    const [creds, media] = await Promise.all([twilioCreds(), callMediaSettings()]);
    if (!creds) return xml(res, buildSayHangupTwiml('Sorry, this call could not be connected. Goodbye.'));
    const qs = `logId=${logId}&userId=${encodeURIComponent(userId)}&mode=PORTAL`;
    // Ringing the agent must not hold up the lead's TwiML; it reports its own failure.
    addAgentToConference({ creds, logId, userId, agent }).catch((error: unknown) => {
      logs.server.error('twilio', 'agent-leg', { error, log_id: logId, msg: 'Could not ring the agent phone' });
    });
    return xml(
      res,
      buildPortalConferenceTwiml({
        conference: conferenceName(logId),
        notice: media.notice,
        transcription: media.liveTranscription
          ? { callbackUrl: `${creds.baseUrl}/twilio/transcription?${qs}`, language: media.language }
          : null,
        recordingCallbackUrl: media.record ? `${creds.baseUrl}/twilio/call-status?${qs}&kind=recording` : null,
      })
    );
  });

  // Live transcription of a portal call: one finished utterance per callback.
  router.post('/transcription', signed('transcription'), async (req: Request, res: Response) => {
    const logId = String(req.query.logId || '').trim();
    const userId = String(req.query.userId || '').trim();
    if (logId) {
      try {
        await handleTranscriptionEvent({ logId, userId, body: req.body ?? {} });
      } catch (error) {
        logs.server.error('twilio', 'transcription', { error, log_id: logId, msg: 'Could not store a transcript segment' });
      }
    }
    return res.status(204).end();
  });

  // AI call conversation turns (Servam brain + Servam voice).
  router.post('/voice/ai', signed('voice-ai'), async (req: Request, res: Response) => {
    const logId = String(req.query.logId || req.body.logId || '').trim();
    if (!logId) return xml(res, buildSayHangupTwiml('Call setup failed. Goodbye.'));
    try {
      const baseUrl = await getWebhookBaseUrl();
      const speech = String(req.body.SpeechResult || '');
      const twiml = await callService.handleAiTurn({ log_id: logId, speech, base_url: baseUrl });
      return xml(res, twiml);
    } catch {
      // Never 500 to Twilio — end the call politely so it doesn't hang.
      return xml(res, buildSayHangupTwiml('Sorry, we hit a problem. Goodbye.'));
    }
  });

  // Serve a cached Servam-synthesized audio clip to Twilio's <Play>.
  router.get('/ai-audio/:token', (req: Request, res: Response) => {
    const entry = audioCache.get(String(req.params.token || ''));
    if (!entry) return res.status(404).end();
    res.setHeader('Content-Type', entry.contentType);
    res.setHeader('Content-Length', String(entry.buffer.length));
    return res.end(entry.buffer);
  });

  // Call/dial/recording status callbacks → update log + push to agent live.
  router.post('/call-status', signed('call-status'), async (req: Request, res: Response) => {
    const logId = String(req.query.logId || '').trim();
    const userId = String(req.query.userId || '').trim();
    const mode = String(req.query.mode || 'PORTAL') as 'PORTAL' | 'AI';
    if (!logId || !userId) return xml(res, EMPTY_TWIML);

    const recordingUrlRaw = String(req.body.RecordingUrl || '');
    const recordingUrl =
      recordingUrlRaw && !/\.(mp3|wav)$/i.test(recordingUrlRaw) ? `${recordingUrlRaw}.mp3` : recordingUrlRaw;

    if (String(req.query.kind || '') === 'recording') {
      if (recordingUrl) {
        const updated = await communicationLogService.update(logId, { recording_url: recordingUrl });
        emitCallStatus(userId, { log_id: logId, status: updated?.status ?? 'COMPLETED', recording_url: recordingUrl, mode });
        // No live transcript (switched off or failed): transcribe the recording, then summarise.
        if (updated && !updated.transcript_segments.length) transcribeRecordingInBackground(logId);
      }
      return xml(res, EMPTY_TWIML);
    }

    if (String(req.query.leg || '') === 'agent') {
      await handleAgentLegStatus(logId, String(req.body.CallStatus || ''));
      return xml(res, EMPTY_TWIML);
    }

    const twilioStatus = String(req.body.DialCallStatus || req.body.CallStatus || '');
    const duration = Number(req.body.DialCallDuration || req.body.CallDuration || 0) || undefined;
    await callService.applyStatus({
      log_id: logId,
      user_id: userId,
      twilio_status: twilioStatus,
      duration_seconds: duration,
      recording_url: recordingUrl || undefined,
      mode,
    });
    return xml(res, EMPTY_TWIML);
  });

  return router;
}
