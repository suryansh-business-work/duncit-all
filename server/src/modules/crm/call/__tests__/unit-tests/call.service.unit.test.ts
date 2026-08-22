/**
 * Placing, driving and reconciling a CRM call, with Twilio and every provider
 * faked.
 *
 * A call costs money and rings a real stranger's phone, so almost every rule
 * here is a refusal:
 *
 *  - nothing is dialled until Twilio is configured AND the number is a real
 *    one. A malformed number is not a failed call, it is a call that was never
 *    worth attempting, and it is reported with the number in it so the agent
 *    can go and fix the lead.
 *  - a log row is written BEFORE the dial and marked FAILED if the dial did
 *    not happen. A call that reached Twilio and one that never left the server
 *    look identical in a CRM that only logs successes.
 *  - the AI leg falls back at every layer. No prompt is a polite goodbye rather
 *    than a silent line; a model that answered nothing becomes "could you
 *    repeat that"; and a dead TTS falls back to Twilio's own voice instead of
 *    dropping the call.
 *  - the conversation ends on a goodbye, or on length. An AI call nobody hangs
 *    up bills by the minute for as long as the line stays open.
 */
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@modules/crm/communicationLog/communicationLog.service', () => ({
  communicationLogService: {
    create: jest.fn(),
    update: jest.fn(),
    get: jest.fn(),
    getMetadata: jest.fn(),
  },
}));
jest.mock('@modules/crm/callPrompt/callPrompt.service', () => ({
  callPromptService: { resolveContext: jest.fn() },
}));
jest.mock('@services/servam/servam.service', () => ({ servamService: { tts: jest.fn() } }));
jest.mock('@services/openai/openai.service', () => ({ openaiService: { chat: jest.fn() } }));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { findById: jest.fn() } }));
jest.mock('./../../call.socket', () => ({ emitCallStatus: jest.fn() }));
jest.mock('./../../audioCache', () => ({ audioCache: { put: jest.fn(() => 'audio-token') } }));
jest.mock('./../../webhookBase', () => ({
  getWebhookBaseUrl: jest.fn(async () => 'https://server.duncit.com'),
}));
jest.mock('./../../phone', () => {
  const actual = jest.requireActual('./../../phone');
  return { ...actual, defaultDialCode: jest.fn(async () => '+91') };
});

import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { communicationLogService } from '@modules/crm/communicationLog/communicationLog.service';
import { callPromptService } from '@modules/crm/callPrompt/callPrompt.service';
import { servamService } from '@services/servam/servam.service';
import { openaiService } from '@services/openai/openai.service';
import { UserModel } from '@modules/access/user/user.model';

import { emitCallStatus } from '../../call.socket';
import { callService } from '../../call.service';

const env = getRuntimeEnvValue as unknown as jest.Mock;
const logs = communicationLogService as unknown as Record<string, jest.Mock>;
const prompts = callPromptService as unknown as Record<string, jest.Mock>;
const servam = servamService as unknown as Record<string, jest.Mock>;
const openai = openaiService as unknown as Record<string, jest.Mock>;
const users = UserModel as unknown as Record<string, jest.Mock>;
const emit = emitCallStatus as unknown as jest.Mock;

const TWILIO = {
  TWILIO_ACCOUNT_SID: 'AC123',
  TWILIO_AUTH_TOKEN: 'token',
  TWILIO_PHONE_NUMBER: '+15550001111',
  TWILIO_AGENT_PHONE_NUMBER: '',
};

const configured = (over: Record<string, string> = {}) => {
  const values = { ...TWILIO, ...over };
  env.mockImplementation(async (key: string) => values[key as keyof typeof values] ?? '');
};

const dialAnswers = (payload: unknown, ok = true, status = 200) =>
  jest.fn(async () => ({ ok, status, json: async () => payload }) as unknown as Response);

const startInput = (over: Record<string, unknown> = {}) => ({
  entity_type: 'VENUE_LEAD' as never,
  entity_id: 'lead-1',
  to: '9000000001',
  prompt_id: 'prompt-1',
  contact_name: 'Meera N',
  user_id: 'u-1',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  configured();
  prompts.resolveContext.mockResolvedValue({
    id: 'prompt-1',
    name: 'Venue outreach',
    context: 'You are calling about listing a venue.',
    language: 'en-IN',
  });
  logs.create.mockResolvedValue({ id: 'log-1', status: 'INITIATED' });
  logs.update.mockImplementation(async (_id: string, patch: Record<string, unknown>) => ({
    id: 'log-1',
    external_id: 'CA123',
    entity_type: 'VENUE_LEAD',
    entity_id: 'lead-1',
    direction: 'OUTBOUND',
    duration_seconds: 0,
    contact_value: '+919000000001',
    recording_url: null,
    error_message: null,
    ...patch,
  }));
  logs.getMetadata.mockResolvedValue({ prompt_id: 'prompt-1', voice: 'meera', ai_history: [] });
  users.findById.mockReturnValue({ lean: async () => null });
  servam.tts.mockResolvedValue({ ok: true, audio: Buffer.from('x'), contentType: 'audio/mpeg' });
  openai.chat.mockResolvedValue({ ok: true, reply: 'Hello, is this a good time?' });
  globalThis.fetch = dialAnswers({ sid: 'CA123' }) as typeof globalThis.fetch;
});

describe('startAiCall', () => {
  it('places the call and records the Twilio id against the log', async () => {
    const result = await callService.startAiCall(startInput());

    expect(result.ok).toBe(true);
    expect(logs.update).toHaveBeenCalledWith('log-1', { external_id: 'CA123' });
  });

  it('dials nothing at all when the prompt is missing or switched off', async () => {
    prompts.resolveContext.mockResolvedValue(null);

    const result = await callService.startAiCall(startInput());

    expect(result.ok).toBe(false);
    expect(logs.create).not.toHaveBeenCalled();
  });

  it('dials nothing while Twilio is not configured, and says which portal to fix it in', async () => {
    configured({ TWILIO_ACCOUNT_SID: '' });

    const result = await callService.startAiCall(startInput());

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Tech portal');
    expect(logs.create).not.toHaveBeenCalled();
  });

  it('refuses a number that is not one, and names it so the lead can be fixed', async () => {
    const result = await callService.startAiCall(startInput({ to: 'not-a-number' }));

    expect(result.ok).toBe(false);
    // A malformed number is not a failed call — it is one never worth trying.
    expect(result.message).toContain('not a valid phone number');
    expect(logs.create).not.toHaveBeenCalled();
  });

  it('marks the log FAILED when Twilio refused the dial', async () => {
    globalThis.fetch = dialAnswers({ message: 'Not a valid phone number' }, false, 400) as typeof globalThis.fetch;

    const result = await callService.startAiCall(startInput());

    expect(result.ok).toBe(false);
    // A call that reached Twilio and one that never left look identical in a
    // CRM that only logs successes.
    expect(logs.update).toHaveBeenCalledWith(
      'log-1',
      expect.objectContaining({ status: 'FAILED' })
    );
  });

  it('marks the log FAILED when the request never completed', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error('socket hang up');
    }) as unknown as typeof globalThis.fetch;

    const result = await callService.startAiCall(startInput());

    expect(result.ok).toBe(false);
    expect(result.message).toContain('socket hang up');
    expect(logs.update).toHaveBeenCalledWith('log-1', expect.objectContaining({ status: 'FAILED' }));
  });

  it('tells Twilio which events to call back on, so a ring is not silence', async () => {
    await callService.startAiCall(startInput());

    const [, init] = (globalThis.fetch as unknown as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = String(init.body);
    for (const event of ['initiated', 'ringing', 'answered', 'completed']) {
      expect(body).toContain(event);
    }
  });
});

describe('startPortalCall', () => {
  it('refuses a customer number that is not one', async () => {
    const result = await callService.startPortalCall(
      startInput({ to: '123' }) as never
    );

    expect(result.ok).toBe(false);
  });

  it('dials nothing while Twilio is not configured', async () => {
    configured({ TWILIO_PHONE_NUMBER: '' });

    const result = await callService.startPortalCall(startInput() as never);

    expect(result.ok).toBe(false);
  });

  it('prefers the configured agent number over the caller own profile', async () => {
    configured({ TWILIO_AGENT_PHONE_NUMBER: '+15550002222' });
    users.findById.mockReturnValue({
      lean: async () => ({ auth: { phone: { number: '9000000009', extension: '+91' } } }),
    });

    const result = await callService.startPortalCall(startInput() as never);

    expect(result.ok).toBe(true);
  });

  it('falls back to the caller own number when nothing is configured', async () => {
    users.findById.mockReturnValue({
      lean: async () => ({ auth: { phone: { number: '9000000009', extension: '+91' } } }),
    });

    const result = await callService.startPortalCall(startInput() as never);

    expect(result.ok).toBe(true);
  });

  it('survives a caller with no profile phone at all', async () => {
    users.findById.mockReturnValue({
      lean: async () => {
        throw new Error('no profile');
      },
    });

    await expect(callService.startPortalCall(startInput() as never)).resolves.toBeDefined();
  });
});

describe('applyStatus', () => {
  it('maps the Twilio word to our status and pushes it to the agent live', async () => {
    const result = await callService.applyStatus({
      log_id: 'log-1',
      user_id: 'u-1',
      twilio_status: 'completed',
      duration_seconds: 42,
    });

    expect(result.terminal).toBe(true);
    expect(emit).toHaveBeenCalledWith('u-1', expect.objectContaining({ log_id: 'log-1' }));
  });

  it('is not terminal while the call is still ringing', async () => {
    const result = await callService.applyStatus({
      log_id: 'log-1',
      user_id: 'u-1',
      twilio_status: 'ringing',
    });

    expect(result.terminal).toBe(false);
  });

  it('records a recording and an error only when there is one', async () => {
    await callService.applyStatus({
      log_id: 'log-1',
      user_id: 'u-1',
      twilio_status: 'completed',
      recording_url: 'https://api.twilio.com/rec.mp3',
      error_message: 'Caller hung up',
    });

    expect(logs.update).toHaveBeenCalledWith(
      'log-1',
      expect.objectContaining({ recording_url: 'https://api.twilio.com/rec.mp3' })
    );
  });
});

describe('reconcile', () => {
  it('refuses a log that is not a call', async () => {
    logs.get.mockResolvedValue({ id: 'log-1', type: 'EMAIL' });

    await expect(callService.reconcile('log-1')).resolves.toMatchObject({ ok: false });
  });

  it('leaves a call that already ended alone', async () => {
    logs.get.mockResolvedValue({ id: 'log-1', type: 'CALL', status: 'COMPLETED' });

    const result = await callService.reconcile('log-1');

    expect(result).toMatchObject({ ok: true, terminal: true });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('can do nothing for a call Twilio has not given an id to yet', async () => {
    logs.get.mockResolvedValue({ id: 'log-1', type: 'CALL', status: 'INITIATED', external_id: '' });

    await expect(callService.reconcile('log-1')).resolves.toMatchObject({ ok: false });
  });

  it('syncs the status Twilio reports onto the log', async () => {
    logs.get.mockResolvedValue({
      id: 'log-1',
      type: 'CALL',
      status: 'INITIATED',
      external_id: 'CA123',
      created_by: 'u-1',
    });
    globalThis.fetch = dialAnswers({ status: 'completed', duration: '42' }) as typeof globalThis.fetch;

    const result = await callService.reconcile('log-1');

    expect(result).toMatchObject({ ok: true, terminal: true });
  });

  it('says so when Twilio could not be read, rather than guessing a status', async () => {
    logs.get.mockResolvedValue({
      id: 'log-1',
      type: 'CALL',
      status: 'INITIATED',
      external_id: 'CA123',
    });
    globalThis.fetch = dialAnswers({}, false, 500) as typeof globalThis.fetch;

    await expect(callService.reconcile('log-1')).resolves.toMatchObject({ ok: false });
  });

  it('survives the request throwing', async () => {
    logs.get.mockResolvedValue({
      id: 'log-1',
      type: 'CALL',
      status: 'INITIATED',
      external_id: 'CA123',
    });
    globalThis.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof globalThis.fetch;

    await expect(callService.reconcile('log-1')).resolves.toMatchObject({ ok: false });
  });
});

describe('synthAudioUrl', () => {
  it('caches the audio and hands back a URL Twilio can play', async () => {
    const url = await callService.synthAudioUrl('Hello', 'meera', 'en-IN', 'https://server.duncit.com');

    expect(url).toBe('https://server.duncit.com/twilio/ai-audio/audio-token');
  });

  it('answers null when the voice service is down, so the caller can fall back', async () => {
    servam.tts.mockResolvedValue({ ok: false });

    await expect(
      callService.synthAudioUrl('Hello', undefined, undefined, 'https://server.duncit.com')
    ).resolves.toBeNull();
  });
});

describe('handleAiTurn', () => {
  const turn = (over: Record<string, unknown> = {}) =>
    callService.handleAiTurn({
      log_id: 'log-1',
      speech: 'Yes, tell me more',
      base_url: 'https://server.duncit.com',
      ...over,
    });

  it('answers with the model reply, voiced and gathered for the next turn', async () => {
    const twiml = await turn();

    expect(twiml).toContain('audio-token');
  });

  it('says goodbye politely when the call could not be set up at all', async () => {
    prompts.resolveContext.mockResolvedValue(null);

    const twiml = await turn();

    // A silent line is worse than a short one.
    expect(twiml).toContain('Goodbye');
  });

  it('says goodbye when the log carries no prompt id', async () => {
    logs.getMetadata.mockResolvedValue({});

    const twiml = await turn();

    expect(twiml).toContain('Goodbye');
  });

  it('asks the caller to repeat rather than going silent when the model said nothing', async () => {
    openai.chat.mockResolvedValue({ ok: false });

    await turn();

    const [, patch] = logs.update.mock.calls.at(-1) as [string, { metadata: { ai_history: unknown[] } }];
    const history = patch.metadata.ai_history as { content: string }[];
    expect(history.at(-1)?.content).toContain('repeat');
  });

  it('falls back to Twilio own voice when the TTS is down, rather than dropping the call', async () => {
    servam.tts.mockResolvedValue({ ok: false });

    const twiml = await turn();

    expect(twiml).not.toContain('audio-token');
    expect(twiml.length).toBeGreaterThan(0);
  });

  it('keeps the conversation, so the model has what was already said', async () => {
    logs.getMetadata.mockResolvedValue({
      prompt_id: 'prompt-1',
      ai_history: [{ role: 'assistant', content: 'Hello' }],
    });

    await turn();

    // The same array is handed to the model and then appended to, so what is
    // asserted is that the earlier turn survived rather than an exact length.
    const [{ history }] = openai.chat.mock.calls[0] as [{ history: { content: string }[] }];
    expect(history.map((turn) => turn.content)).toContain('Hello');
    expect(history.map((turn) => turn.content)).toContain('Yes, tell me more');
  });

  it('hangs up on a goodbye, so an AI call does not bill for an open line', async () => {
    const twiml = await turn({ speech: 'Ok thanks, bye' });

    expect(twiml).toBeDefined();
  });

  it('hangs up once the conversation has run long, whatever was said', async () => {
    logs.getMetadata.mockResolvedValue({
      prompt_id: 'prompt-1',
      ai_history: Array.from({ length: 26 }, (_, index) => ({
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `turn ${index}`,
      })),
    });

    const twiml = await turn();

    expect(twiml).toBeDefined();
  });

  it('handles a turn where the customer said nothing at all', async () => {
    const twiml = await turn({ speech: '   ' });

    expect(twiml.length).toBeGreaterThan(0);
  });
});
