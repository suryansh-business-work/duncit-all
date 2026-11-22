/**
 * What a CRM call reads from the Tech portal's TWILIO entry: the credentials,
 * which of them are missing (the portal names them), the recording and
 * transcription switches, and which phone rings for the agent.
 */
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { findById: jest.fn() } }));
jest.mock('./../../webhookBase', () => ({ getWebhookBaseUrl: jest.fn(async () => 'https://server.example.test') }));

import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { UserModel } from '@modules/access/user/user.model';
import {
  callMediaSettings,
  DEFAULT_RECORDING_NOTICE,
  missingTwilioFields,
  resolveAgentNumber,
  twilioApi,
  twilioCreds,
} from '../../call.config';

const env = getRuntimeEnvValue as unknown as jest.Mock;
const users = UserModel as unknown as { findById: jest.Mock };

const withEnv = (values: Record<string, string>) => env.mockImplementation(async (key: string) => values[key] ?? '');
const FULL = { TWILIO_ACCOUNT_SID: 'AC1', TWILIO_AUTH_TOKEN: 'secret', TWILIO_PHONE_NUMBER: '+15550001111' };
const profile = (phone: unknown) => users.findById.mockReturnValue({ lean: async () => phone });

beforeEach(() => {
  withEnv(FULL);
  profile(null);
});

describe('twilioCreds', () => {
  it('hands back the credentials and the webhook base when all three keys are set', async () => {
    await expect(twilioCreds()).resolves.toEqual({
      accountSid: 'AC1',
      authToken: 'secret',
      fromNumber: '+15550001111',
      baseUrl: 'https://server.example.test',
    });
  });

  it.each(['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'])('is null while %s is empty', async (key) => {
    withEnv({ ...FULL, [key]: '' });
    await expect(twilioCreds()).resolves.toBeNull();
  });
});

describe('missingTwilioFields', () => {
  it('names nothing when the entry is complete', async () => {
    await expect(missingTwilioFields()).resolves.toEqual([]);
  });

  it('names every empty or blank field by its Tech portal name', async () => {
    withEnv({ TWILIO_ACCOUNT_SID: '  ', TWILIO_AUTH_TOKEN: '', TWILIO_PHONE_NUMBER: '' });
    await expect(missingTwilioFields()).resolves.toEqual(['account_sid', 'auth_token', 'phone_number']);
  });
});

describe('twilioApi', () => {
  const creds = { accountSid: 'AC1', authToken: 'secret' };
  const answer = (json: () => Promise<unknown>, ok = true, status = 200) =>
    jest.fn(async () => ({ ok, status, json }) as unknown as Response);

  it('POSTs a form with basic auth when given a body', async () => {
    globalThis.fetch = answer(async () => ({ sid: 'CA1' })) as typeof fetch;

    const res = await twilioApi(creds, '/Calls.json', new URLSearchParams({ To: '+91' }));

    expect(res).toEqual({ ok: true, status: 200, json: { sid: 'CA1' } });
    const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC1/Calls.json');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      Authorization: `Basic ${Buffer.from('AC1:secret').toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    });
  });

  it('GETs without a content type when there is no body', async () => {
    globalThis.fetch = answer(async () => ({})) as typeof fetch;

    await twilioApi(creds, '/Calls/CA1.json');

    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('GET');
    expect(init.headers).not.toHaveProperty('Content-Type');
  });

  it('reports a refusal whose body is not JSON as an empty object, without throwing', async () => {
    globalThis.fetch = answer(async () => {
      throw new SyntaxError('Unexpected token');
    }, false, 502) as typeof fetch;

    await expect(twilioApi(creds, '/Calls.json')).resolves.toEqual({ ok: false, status: 502, json: {} });
  });
});

describe('callMediaSettings', () => {
  it('records and transcribes in en-IN with the default notice while nothing is set', async () => {
    await expect(callMediaSettings()).resolves.toEqual({
      record: true,
      liveTranscription: true,
      language: 'en-IN',
      notice: DEFAULT_RECORDING_NOTICE,
    });
  });

  it('honours an explicit "false" (any case) and the configured language and notice', async () => {
    withEnv({
      TWILIO_RECORD_CALLS: 'FALSE',
      TWILIO_LIVE_TRANSCRIPTION: ' false ',
      TWILIO_TRANSCRIPTION_LANGUAGE: ' hi-IN ',
      TWILIO_RECORDING_NOTICE: ' Yeh call record ho sakti hai. ',
    });

    await expect(callMediaSettings()).resolves.toEqual({
      record: false,
      liveTranscription: false,
      language: 'hi-IN',
      notice: 'Yeh call record ho sakti hai.',
    });
  });

  it('treats anything but "false" as on', async () => {
    withEnv({ TWILIO_RECORD_CALLS: 'true', TWILIO_LIVE_TRANSCRIPTION: 'yes' });
    const settings = await callMediaSettings();
    expect(settings.record && settings.liveTranscription).toBe(true);
  });
});

describe('resolveAgentNumber', () => {
  it('prefers the configured agent number', async () => {
    withEnv({ TWILIO_AGENT_PHONE_NUMBER: '+15550002222' });
    profile({ auth: { phone: { number: '9000000009', extension: '+91' } } });

    await expect(resolveAgentNumber('u1')).resolves.toEqual({ number: '+15550002222', source: 'CONFIG' });
  });

  it('falls back to the profile phone, defaulting its code to +91', async () => {
    profile({ auth: { phone: { number: '9000000009' } } });

    await expect(resolveAgentNumber('u1')).resolves.toEqual({ number: '+919000000009', source: 'PROFILE' });
  });

  it('skips a placeholder configured number for a real profile phone', async () => {
    withEnv({ TWILIO_AGENT_PHONE_NUMBER: '+00000000' });
    profile({ auth: { phone: { number: '9000000009', extension: '+91' } } });

    await expect(resolveAgentNumber('u1')).resolves.toEqual({ number: '+919000000009', source: 'PROFILE' });
  });

  it('hands back the only (invalid) candidate so the caller can name it', async () => {
    withEnv({ TWILIO_AGENT_PHONE_NUMBER: '12' });

    await expect(resolveAgentNumber('u1')).resolves.toEqual({ number: '+9112', source: 'CONFIG' });
  });

  it('is null with no configured number and no profile phone', async () => {
    profile({ auth: {} });
    await expect(resolveAgentNumber('u1')).resolves.toBeNull();
  });

  it('survives the profile lookup failing', async () => {
    users.findById.mockReturnValue({
      lean: async () => {
        throw new Error('db down');
      },
    });
    await expect(resolveAgentNumber('u1')).resolves.toBeNull();
  });
});
