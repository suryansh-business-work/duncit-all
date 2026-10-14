import express, { Router, type Request, type Response } from 'express';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { userService } from '@modules/access/user/user.service';
import { logs } from '@observability/log';
import type { FormBody } from './twilioSignature';
import { requireTwilioSignature } from './twilioWebhookGuard';

/**
 * `POST /twilio/recordings` — the recording callback of an admin's recorded
 * call to a user (see `startTwilioRecordedBridge` in user.contact.ts).
 *
 * It used to accept anyone: the route writes a recording URL onto whichever
 * contact action the query names, so an unauthenticated POST could replace the
 * recording on any admin's call log with a link of its choosing. It now admits
 * only a request signed with the account's auth token.
 *
 * The signed URL is rebuilt from `TWILIO_WEBHOOK_BASE_URL` — the very value
 * the callback URL handed to Twilio was built from (user.contact.ts) — rather
 * than from the request's own host, which behind the proxy is not what Twilio
 * called.
 */
export function buildRecordingWebhookRouter(): Router {
  const router = Router();
  const signed = requireTwilioSignature('recordings', () => getRuntimeEnvValue('TWILIO_WEBHOOK_BASE_URL'));
  router.post('/recordings', express.urlencoded({ extended: false }), signed, async (req: Request, res: Response) => {
    const body: FormBody = req.body ?? {};
    const field = (name: string) => {
      const value = body[name];
      return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
    };

    try {
      const rawUrl = field('RecordingUrl');
      const recordingUrl = rawUrl && !/\.(mp3|wav)$/i.test(rawUrl) ? `${rawUrl}.mp3` : rawUrl;
      const actionId = req.query.contactActionId;
      await userService.attachCallRecording({
        actionId: typeof actionId === 'string' ? actionId : '',
        callSid: field('CallSid'),
        recordingSid: field('RecordingSid'),
        recordingUrl,
        durationSeconds: Number(field('RecordingDuration')) || 0,
      });
    } catch (error) {
      // Still 204: Twilio retrying a callback we cannot store helps nobody,
      // but the failure must be visible.
      logs.server.error('twilio', 'recordings', { error, msg: 'Could not attach the call recording' });
    }
    return res.status(204).end();
  });
  return router;
}
