/**
 * The Claude transport: OpenAI-style messages become Anthropic's system
 * prompt and turns, JSON is asked for and read back without fences, a
 * refusal and an empty answer are typed failures with the tokens they burned,
 * and the SDK's errors map to the funnel's codes. The SDK itself is faked.
 */
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@anthropic-ai/sdk', () => {
  const actual = jest.requireActual<typeof import('@anthropic-ai/sdk')>('@anthropic-ai/sdk');
  const create = jest.fn();
  const construct = jest.fn();
  class FakeAnthropic {
    static create = create;
    static construct = construct;
    static APIError = actual.APIError;
    static APIConnectionError = actual.APIConnectionError;
    beta = { messages: { create } };
    constructor(options: unknown) {
      construct(options);
    }
  }
  return { __esModule: true, default: FakeAnthropic, APIError: actual.APIError, APIConnectionError: actual.APIConnectionError };
});

import Anthropic from '@anthropic-ai/sdk';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { CLAUDE_DEFAULT_MODEL, claudeDefaultModel, claudeMessages, isClaudeModel, unfenced } from '../../anthropic.client';

const sdk = Anthropic as unknown as { create: jest.Mock; construct: jest.Mock };
const env = getRuntimeEnvValue as unknown as jest.Mock;
const USAGE = { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17 };

const reply = (over: Record<string, unknown> = {}) => ({
  content: [{ type: 'text', text: 'Hello' }],
  stop_reason: 'end_turn',
  stop_details: null,
  usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 2, cache_creation_input_tokens: null },
  ...over,
});

const ask = (over: Partial<Parameters<typeof claudeMessages>[0]> = {}) =>
  claudeMessages({ apiKey: 'sk-ant-test', model: 'claude-opus-5-5', messages: [{ role: 'user', content: 'Hi' }], ...over });

beforeEach(() => {
  sdk.create.mockReset();
  sdk.construct.mockReset();
  env.mockReset();
});

describe('claudeMessages', () => {
  it('sends the system prompt and the turns in Claude’s shape, with the refusal fallback on, and counts cached tokens as prompt tokens', async () => {
    sdk.create.mockResolvedValue(reply());

    const result = await ask({
      max_tokens: 600,
      messages: [
        { role: 'system', content: 'RULES' },
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Look at this' },
            { type: 'image_url', image_url: { url: 'https://cdn.duncit.test/a.png' } },
            { type: 'image_url', image_url: { url: 'data:image/PNG;base64,AAAA' } },
            // A part with nothing usable in it is left out rather than sent broken.
            { type: 'image_url' },
            { type: 'weird' },
          ],
        },
        { role: 'system', content: { note: 'late' } },
      ],
    });

    expect(sdk.construct).toHaveBeenCalledWith({ apiKey: 'sk-ant-test', maxRetries: 1 });
    expect(sdk.create).toHaveBeenCalledWith({
      model: 'claude-opus-5-5',
      max_tokens: 600,
      system: 'RULES\n\n{"note":"late"}',
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Look at this' },
            { type: 'image', source: { type: 'url', url: 'https://cdn.duncit.test/a.png' } },
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } },
          ],
        },
      ],
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    expect(result).toEqual({ ok: true, status: 200, content: 'Hello', usage: USAGE });
  });

  it('asks for JSON in the system prompt, defaults max_tokens, keeps only the text blocks and strips the fences Claude sometimes adds', async () => {
    sdk.create.mockResolvedValue(reply({ content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '```json\n{"a":1}\n```' }] }));

    const result = await ask({ json: true });

    expect(sdk.create.mock.calls[0][0]).toMatchObject({
      max_tokens: 4096,
      system: 'Answer with exactly one JSON object and nothing else: no words before or after it, and no code fences.',
    });
    expect(result).toMatchObject({ ok: true, content: '{"a":1}' });

    // A turn whose content is not text is sent as JSON rather than dropped.
    sdk.create.mockResolvedValue(reply({ content: [{ type: 'text', text: ' {"b":2} ' }] }));
    expect(await ask({ json: true, messages: [{ role: 'user', content: { b: 2 } }] })).toMatchObject({ content: '{"b":2}' });
    expect(sdk.create.mock.calls[1][0].messages).toEqual([{ role: 'user', content: '{"b":2}' }]);
  });

  it('reports a refusal with its category, and an empty answer, each with the tokens it burned', async () => {
    sdk.create.mockResolvedValueOnce(reply({ stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'cyber', explanation: null } }));
    expect(await ask()).toEqual({ ok: false, code: 'EMPTY', status: 200, message: 'Claude declined this request (cyber).', usage: USAGE });

    sdk.create.mockResolvedValueOnce(reply({ stop_reason: 'refusal', stop_details: null, usage: { input_tokens: 3, output_tokens: 0 } }));
    expect(await ask()).toMatchObject({
      code: 'EMPTY',
      message: 'Claude declined this request (policy).',
      usage: { prompt_tokens: 3, completion_tokens: 0, total_tokens: 3 },
    });

    sdk.create.mockResolvedValueOnce(reply({ content: [] }));
    expect(await ask()).toMatchObject({ ok: false, code: 'EMPTY', status: 200, message: 'Claude returned an empty response', usage: USAGE });
  });

  it('maps the SDK’s errors: unreachable is NETWORK, an API error is UPSTREAM with its status, anything else is NETWORK', async () => {
    sdk.create.mockRejectedValueOnce(new Anthropic.APIConnectionError({ message: 'socket hang up' }));
    expect(await ask()).toEqual({ ok: false, code: 'NETWORK', status: 0, message: 'Anthropic is unreachable (socket hang up)' });

    sdk.create.mockRejectedValueOnce(new Anthropic.APIError(429, { error: { message: 'rate limited' } }, 'rate limited', new Headers()));
    const upstream = await ask();
    expect(upstream).toMatchObject({ ok: false, code: 'UPSTREAM', status: 429 });
    expect((upstream as { message: string }).message).toContain('rate limited');

    sdk.create.mockRejectedValueOnce(new Error('boom'));
    expect(await ask()).toEqual({ ok: false, code: 'NETWORK', status: 0, message: 'boom' });

    sdk.create.mockRejectedValueOnce('odd');
    expect(await ask()).toMatchObject({ code: 'NETWORK', message: 'odd' });
  });
});

describe('model helpers', () => {
  it('recognises a Claude model by its prefix, whatever the case or spacing', () => {
    expect(isClaudeModel('claude-opus-5-5')).toBe(true);
    expect(isClaudeModel('  Claude-Haiku-5-5 ')).toBe(true);
    expect(isClaudeModel('gpt-4o')).toBe(false);
    expect(isClaudeModel('')).toBe(false);
    expect(isClaudeModel(null)).toBe(false);
    expect(isClaudeModel(undefined)).toBe(false);
  });

  it('takes the configured Claude model, and Opus when none (or something that is not Claude) is set', async () => {
    env.mockResolvedValueOnce('');
    expect(await claudeDefaultModel()).toBe(CLAUDE_DEFAULT_MODEL);
    env.mockResolvedValueOnce(' claude-haiku-5-5 ');
    expect(await claudeDefaultModel()).toBe('claude-haiku-5-5');
    env.mockResolvedValueOnce('gpt-4o-mini');
    expect(await claudeDefaultModel()).toBe('claude-opus-5-5');
    expect(env).toHaveBeenCalledWith('ANTHROPIC_MODEL');
  });

  it('leaves an answer without fences alone, trimmed, and opens one with bare fences', () => {
    expect(unfenced('  {"a":1}\n')).toBe('{"a":1}');
    expect(unfenced('```\n{"a":1}\n```')).toBe('{"a":1}');
  });
});
