/**
 * The CRM call webhooks admit only Twilio. `/call-status` rewrites a call log's
 * status and recording, `/voice/portal` dials an agent and `/voice/ai` runs a
 * paid AI turn — so an unsigned or mis-signed POST must be refused with 403
 * before any of that happens, and a genuinely signed one must still work.
 */
import crypto from 'node:crypto';
import express from 'express';
import request from 'supertest';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn() } } }));
jest.mock('@modules/crm/communicationLog/communicationLog.service', () => ({
  communicationLogService: { update: jest.fn() },
}));
jest.mock('./../../call.service', () => ({ callService: { applyStatus: jest.fn(), handleAiTurn: jest.fn() } }));
jest.mock('./../../call.socket', () => ({ emitCallStatus: jest.fn() }));
jest.mock('./../../webhookBase', () => ({ getWebhookBaseUrl: jest.fn() }));

import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { logs } from '@observability/log';
import { communicationLogService } from '@modules/crm/communicationLog/communicationLog.service';
import { callService } from '../../call.service';
import { emitCallStatus } from '../../call.socket';
import { getWebhookBaseUrl } from '../../webhookBase';
import { buildCallWebhookRouter } from '../../call.webhook';

const TOKEN = 'twilio-test-auth-token';
const BASE = 'https://server.example.test';

const mockEnv = getRuntimeEnvValue as jest.Mock;
const mockBase = getWebhookBaseUrl as jest.Mock;
const mockApply = callService.applyStatus as jest.Mock;
const mockAiTurn = callService.handleAiTurn as jest.Mock;
const mockLogUpdate = communicationLogService.update as jest.Mock;
const mockEmit = emitCallStatus as jest.Mock;
const mockWarn = logs.server.warn as jest.Mock;

const app = express().use('/twilio', buildCallWebhookRouter());

/** Twilio's documented signature, computed independently of the module. */
const sign = (path: string, params: Record<string, string>, token = TOKEN) =>
  crypto
    .createHmac('sha1', token)
    .update(
      Object.keys(params)
        .sort((a, b) => a.localeCompare(b))
        .reduce((acc, k) => acc + k + params[k], `${BASE}${path}`)
    )
    .digest('base64');

const STATUS_PATH = '/twilio/call-status?logId=log1&userId=user1&mode=PORTAL';
const STATUS_FORM = { CallStatus: 'completed', CallDuration: '42', CallSid: 'CA1' };
const RECORDING_PATH = '/twilio/call-status?logId=log1&userId=user1&mode=PORTAL&kind=recording';
const RECORDING_FORM = { RecordingUrl: 'https://api.twilio.com/rec/RE1', CallSid: 'CA1' };
const PORTAL_PATH = '/twilio/voice/portal?logId=log1&userId=user1&agent=%2B919800000000';
const PORTAL_FORM = { CallSid: 'CA1', CallStatus: 'in-progress' };
const AI_PATH = '/twilio/voice/ai?logId=log1&userId=user1';
const AI_FORM = { CallSid: 'CA1', SpeechResult: 'Tell me more' };

const routes = [
  { name: 'call-status', path: STATUS_PATH, form: STATUS_FORM },
  { name: 'call-status recording', path: RECORDING_PATH, form: RECORDING_FORM },
  { name: 'voice-portal', path: PORTAL_PATH, form: PORTAL_FORM },
  { name: 'voice-ai', path: AI_PATH, form: AI_FORM },
];

const expectNothingDone = () => {
  expect(mockApply).not.toHaveBeenCalled();
  expect(mockLogUpdate).not.toHaveBeenCalled();
  expect(mockEmit).not.toHaveBeenCalled();
  expect(mockAiTurn).not.toHaveBeenCalled();
};

beforeEach(() => {
  mockEnv.mockImplementation(
    async (key: string) => ({ TWILIO_AUTH_TOKEN: TOKEN, TWILIO_PHONE_NUMBER: '+15550001111' })[key] ?? ''
  );
  mockBase.mockResolvedValue(BASE);
  mockApply.mockResolvedValue(undefined);
  mockLogUpdate.mockResolvedValue({ status: 'COMPLETED' });
  mockAiTurn.mockResolvedValue('<Response><Say>Hi</Say></Response>');
});

describe.each(routes)('POST $name', ({ path, form }) => {
  it('refuses an unsigned request with an empty 403, changes nothing and logs no request data', async () => {
    const res = await request(app).post(path).type('form').send(form);

    expect(res.status).toBe(403);
    expect(res.text).toBe('');
    expectNothingDone();
    expect(mockWarn).toHaveBeenCalledWith('twilio', expect.any(String), {
      msg: 'Refused an unsigned or wrongly signed Twilio callback',
      has_signature: false,
      configured: true,
    });
  });

  it('refuses a signature made with another token', async () => {
    const res = await request(app)
      .post(path)
      .set('X-Twilio-Signature', sign(path, form, 'not-the-token'))
      .type('form')
      .send(form);

    expect(res.status).toBe(403);
    expectNothingDone();
  });

  it('refuses a genuine signature replayed with a tampered body', async () => {
    const res = await request(app)
      .post(path)
      .set('X-Twilio-Signature', sign(path, form))
      .type('form')
      .send({ ...form, CallSid: 'CA-forged' });

    expect(res.status).toBe(403);
    expectNothingDone();
  });

  it('refuses everything while the auth token is not configured', async () => {
    mockEnv.mockResolvedValue('');
    const res = await request(app).post(path).set('X-Twilio-Signature', sign(path, form)).type('form').send(form);

    expect(res.status).toBe(403);
    expectNothingDone();
    expect(mockWarn).toHaveBeenCalledWith('twilio', expect.any(String), expect.objectContaining({ configured: false }));
  });
});

describe('correctly signed callbacks are processed', () => {
  it('call-status applies the status Twilio reported', async () => {
    const res = await request(app)
      .post(STATUS_PATH)
      .set('X-Twilio-Signature', sign(STATUS_PATH, STATUS_FORM))
      .type('form')
      .send(STATUS_FORM);

    expect(res.status).toBe(200);
    expect(res.text).toContain('<Response></Response>');
    expect(mockApply).toHaveBeenCalledWith({
      log_id: 'log1',
      user_id: 'user1',
      twilio_status: 'completed',
      duration_seconds: 42,
      recording_url: undefined,
      mode: 'PORTAL',
    });
  });

  it('a signed status replayed against another call log is refused', async () => {
    const res = await request(app)
      .post('/twilio/call-status?logId=victim&userId=user1&mode=PORTAL')
      .set('X-Twilio-Signature', sign(STATUS_PATH, STATUS_FORM))
      .type('form')
      .send(STATUS_FORM);

    expect(res.status).toBe(403);
    expectNothingDone();
  });

  it('the recording callback stores the recording (.mp3 appended) and pushes it to the agent', async () => {
    const res = await request(app)
      .post(RECORDING_PATH)
      .set('X-Twilio-Signature', sign(RECORDING_PATH, RECORDING_FORM))
      .type('form')
      .send(RECORDING_FORM);

    expect(res.status).toBe(200);
    expect(mockLogUpdate).toHaveBeenCalledWith('log1', { recording_url: 'https://api.twilio.com/rec/RE1.mp3' });
    expect(mockEmit).toHaveBeenCalledWith('user1', {
      log_id: 'log1',
      status: 'COMPLETED',
      recording_url: 'https://api.twilio.com/rec/RE1.mp3',
      mode: 'PORTAL',
    });
    expect(mockApply).not.toHaveBeenCalled();
  });

  it('voice-portal answers TwiML that dials the agent', async () => {
    const res = await request(app)
      .post(PORTAL_PATH)
      .set('X-Twilio-Signature', sign(PORTAL_PATH, PORTAL_FORM))
      .type('form')
      .send(PORTAL_FORM);

    expect(res.status).toBe(200);
    expect(res.type).toBe('text/xml');
    expect(res.text).toContain('<Dial');
    expect(res.text).toContain('+919800000000');
    expect(res.text).toContain(`${BASE}/twilio/call-status?logId=log1`);
  });

  it('voice-ai runs the AI turn with the caller speech and the webhook base', async () => {
    const res = await request(app)
      .post(AI_PATH)
      .set('X-Twilio-Signature', sign(AI_PATH, AI_FORM))
      .type('form')
      .send(AI_FORM);

    expect(res.status).toBe(200);
    expect(res.text).toBe('<Response><Say>Hi</Say></Response>');
    expect(mockAiTurn).toHaveBeenCalledWith({ log_id: 'log1', speech: 'Tell me more', base_url: BASE });
  });

  it('a request signed for the proxy-internal host instead of the public base is refused', async () => {
    const internal = crypto
      .createHmac('sha1', TOKEN)
      .update(
        Object.keys(AI_FORM)
          .sort((a, b) => a.localeCompare(b))
          .reduce((acc, k) => acc + k + AI_FORM[k as keyof typeof AI_FORM], `http://127.0.0.1:2001${AI_PATH}`)
      )
      .digest('base64');
    const res = await request(app).post(AI_PATH).set('X-Twilio-Signature', internal).type('form').send(AI_FORM);

    expect(res.status).toBe(403);
    expect(mockAiTurn).not.toHaveBeenCalled();
  });
});

describe('GET /twilio/ai-audio/:token', () => {
  it('stays reachable without a signature (the random token is the credential) and 404s an unknown one', async () => {
    const res = await request(app).get('/twilio/ai-audio/unknown-token');

    expect(res.status).toBe(404);
    expect(mockWarn).not.toHaveBeenCalled();
  });
});
