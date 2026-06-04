import { Router, type Request, type Response } from 'express';
import express from 'express';
import { communicationLogService } from '@modules/crm/communicationLog/communicationLog.service';
import { callService } from './call.service';
import { audioCache } from './audioCache';
import { emitCallStatus } from './call.socket';
import { getWebhookBaseUrl } from './webhookBase';
import { buildPortalDialTwiml, buildSayHangupTwiml, escapeXml } from './call.twiml';

const xml = (res: Response, body: string) => res.type('text/xml').send(body);
const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

/**
 * Twilio Voice webhooks for CRM calls (Servam-voiced). Mounted under `/twilio`.
 * Twilio posts application/x-www-form-urlencoded, so the router parses that.
 */
export function buildCallWebhookRouter(): Router {
  const router = Router();
  router.use(express.urlencoded({ extended: false }));

  // Portal call: the agent's phone answered → Servam connect clip, then bridge to customer.
  router.post('/voice/portal', async (req: Request, res: Response) => {
    const logId = String(req.query.logId || '').trim();
    const userId = String(req.query.userId || '').trim();
    const to = String(req.query.to || '').trim();
    if (!to) return xml(res, buildSayHangupTwiml('No customer number. Goodbye.'));
    const base = await getWebhookBaseUrl();
    const qs = `logId=${logId}&userId=${encodeURIComponent(userId)}&mode=PORTAL`;
    const audioUrl = await callService.synthAudioUrl('Connecting your Duncit call now.', undefined, 'en-IN', base);
    if (!audioUrl) {
      return xml(
        res,
        [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<Response>',
          '<Say>Connecting your Duncit call now.</Say>',
          `<Dial answerOnBridge="true" action="${escapeXml(`${base}/twilio/call-status?${qs}`)}" method="POST" record="record-from-answer-dual" recordingStatusCallback="${escapeXml(`${base}/twilio/call-status?${qs}&kind=recording`)}" recordingStatusCallbackMethod="POST">`,
          `<Number>${escapeXml(to)}</Number>`,
          '</Dial>',
          '</Response>',
        ].join('')
      );
    }
    return xml(
      res,
      buildPortalDialTwiml({
        customer: to,
        connectAudioUrl: audioUrl,
        actionUrl: `${base}/twilio/call-status?${qs}`,
        recordingCallbackUrl: `${base}/twilio/call-status?${qs}&kind=recording`,
      })
    );
  });

  // AI call conversation turns (Servam brain + Servam voice).
  router.post('/voice/ai', async (req: Request, res: Response) => {
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
  router.post('/call-status', async (req: Request, res: Response) => {
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
      }
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
