import crypto from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { userService } from '@modules/access/user/user.service';
import { logs } from '@observability/log';
import { buildRecordingWebhookRouter } from '../../recordingWebhook';
import { isValidTwilioSignature, twilioSignature } from '../../twilioSignature';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@modules/access/user/user.service', () => ({ userService: { attachCallRecording: jest.fn() } }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn() } } }));

const TOKEN = 'twilio-test-auth-token';
const BASE = 'https://server.example.test/';
const PATH = '/twilio/recordings?contactActionId=abc123';
const FORM = {
  RecordingUrl: 'https://api.twilio.com/rec/RE1',
  CallSid: 'CA1',
  RecordingSid: 'RE1',
  RecordingDuration: '42',
};

const mockEnv = getRuntimeEnvValue as jest.Mock;
const mockAttach = userService.attachCallRecording as jest.Mock;
const mockWarn = logs.server.warn as jest.Mock;
const mockError = logs.server.error as jest.Mock;

const app = express().use('/twilio', buildRecordingWebhookRouter());

/** The signature exactly as Twilio documents it, computed independently of the module. */
const reference = (url: string, params: Record<string, string>) =>
  crypto
    .createHmac('sha1', TOKEN)
    .update(Object.keys(params).sort((a, b) => a.localeCompare(b)).reduce((acc, k) => acc + k + params[k], url))
    .digest('base64');

const signedUrl = `https://server.example.test${PATH}`;

beforeEach(() => {
  mockEnv.mockImplementation(async (key: string) =>
    ({ TWILIO_AUTH_TOKEN: TOKEN, TWILIO_WEBHOOK_BASE_URL: BASE })[key] ?? ''
  );
  mockAttach.mockResolvedValue(true);
});

describe('twilioSignature', () => {
  it('matches the documented algorithm: URL + sorted name/value pairs, HMAC-SHA1, base64', () => {
    expect(twilioSignature(TOKEN, signedUrl, FORM)).toBe(reference(signedUrl, FORM));
  });

  it('signs a repeated field value by value, in sorted order', () => {
    const expected = crypto.createHmac('sha1', TOKEN).update(`${signedUrl}Aa1Aa2Bz`).digest('base64');
    expect(twilioSignature(TOKEN, signedUrl, { B: 'z', A: ['a2', 'a1'] })).toBe(expected);
  });

  it('refuses a missing header, a missing token, a wrong length and a tampered body', () => {
    const good = reference(signedUrl, FORM);
    expect(isValidTwilioSignature(TOKEN, signedUrl, FORM, good)).toBe(true);
    expect(isValidTwilioSignature(TOKEN, signedUrl, FORM, undefined)).toBe(false);
    expect(isValidTwilioSignature('', signedUrl, FORM, good)).toBe(false);
    expect(isValidTwilioSignature(TOKEN, signedUrl, FORM, 'short')).toBe(false);
    expect(isValidTwilioSignature(TOKEN, signedUrl, { ...FORM, RecordingUrl: 'https://evil.test/x' }, good)).toBe(false);
    expect(isValidTwilioSignature(TOKEN, `${signedUrl}x`, FORM, good)).toBe(false);
  });
});

describe('POST /twilio/recordings', () => {
  it('accepts a Twilio-signed callback and attaches the recording', async () => {
    const res = await request(app)
      .post(PATH)
      .set('X-Twilio-Signature', reference(signedUrl, FORM))
      .type('form')
      .send(FORM);

    expect(res.status).toBe(204);
    expect(mockAttach).toHaveBeenCalledWith({
      actionId: 'abc123',
      callSid: 'CA1',
      recordingSid: 'RE1',
      recordingUrl: 'https://api.twilio.com/rec/RE1.mp3',
      durationSeconds: 42,
    });
  });

  it('refuses an unsigned request with 403, writes nothing and logs no request data', async () => {
    const res = await request(app).post(PATH).type('form').send(FORM);

    expect(res.status).toBe(403);
    expect(mockAttach).not.toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalledWith('twilio', 'recordings', {
      msg: 'Refused an unsigned or wrongly signed Twilio callback',
      has_signature: false,
      configured: true,
    });
  });

  it('refuses a signature made with another token, or for another contact action', async () => {
    const forged = crypto
      .createHmac('sha1', 'not-the-token')
      .update(Object.keys(FORM).sort((a, b) => a.localeCompare(b)).reduce((acc, k) => acc + k + FORM[k as keyof typeof FORM], signedUrl))
      .digest('base64');
    const wrongToken = await request(app).post(PATH).set('X-Twilio-Signature', forged).type('form').send(FORM);
    // A genuine signature replayed against a different contact action's URL.
    const otherAction = await request(app)
      .post('/twilio/recordings?contactActionId=victim')
      .set('X-Twilio-Signature', reference(signedUrl, FORM))
      .type('form')
      .send(FORM);

    expect(wrongToken.status).toBe(403);
    expect(otherAction.status).toBe(403);
    expect(mockAttach).not.toHaveBeenCalled();
  });

  it('refuses everything while Twilio is not configured', async () => {
    mockEnv.mockResolvedValue('');
    const res = await request(app)
      .post(PATH)
      .set('X-Twilio-Signature', reference(signedUrl, FORM))
      .type('form')
      .send(FORM);

    expect(res.status).toBe(403);
    expect(mockAttach).not.toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalledWith('twilio', 'recordings', expect.objectContaining({ configured: false }));
  });

  it('still answers 204 to a signed callback it cannot store, and logs the failure', async () => {
    mockAttach.mockRejectedValueOnce(new Error('bad id'));
    const res = await request(app)
      .post(PATH)
      .set('X-Twilio-Signature', reference(signedUrl, FORM))
      .type('form')
      .send(FORM);

    expect(res.status).toBe(204);
    expect(mockError).toHaveBeenCalledWith(
      'twilio',
      'recordings',
      expect.objectContaining({ msg: 'Could not attach the call recording' })
    );
  });
});
