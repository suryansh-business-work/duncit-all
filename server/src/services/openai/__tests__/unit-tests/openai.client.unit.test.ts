/**
 * `openaiChat` — the one funnel every OpenAI call goes through.
 *
 * Two guarantees matter most:
 *  - a feature switched off in AI portal > AI Features never reaches OpenAI
 *    (nothing is spent), yet still leaves a SKIPPED usage row with zero tokens,
 *    so the console can say how often the switch refused a call;
 *  - every other ending (no key, transport failure, upstream error, empty
 *    answer, success) is recorded and reported as a typed failure code rather
 *    than a throw, because each call site decides what a failure means.
 */
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@modules/ai/aiFeature/aiFeature.guard', () => ({ isAiFeatureEnabled: jest.fn() }));
jest.mock('@modules/ai/openaiUsage/openaiUsage.service', () => ({
  openAiUsageService: { recordUsage: jest.fn() },
}));

import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { isAiFeatureEnabled } from '@modules/ai/aiFeature/aiFeature.guard';
import { openAiUsageService } from '@modules/ai/openaiUsage/openaiUsage.service';
import { OPENAI_TASKS } from '@modules/ai/openaiUsage/openaiUsage.tasks';
import { openaiChat, type OpenAiChatRequest } from '../../openai.client';

const env = getRuntimeEnvValue as unknown as jest.Mock;
const featureOn = isAiFeatureEnabled as unknown as jest.Mock;
const recordUsage = openAiUsageService.recordUsage as unknown as jest.Mock;
const realFetch = globalThis.fetch;
let fetchMock: jest.Mock;

const configure = (values: Record<string, string>) => {
  env.mockImplementation(async (key: string) => values[key] ?? '');
};

const request = (over: Partial<OpenAiChatRequest> = {}): OpenAiChatRequest => ({
  task: 'moderation.pod',
  messages: [
    { role: 'system', content: 'SYSTEM RULES' },
    { role: 'user', content: 'Is this pod fine?' },
  ],
  detail: 'pod-42',
  user_id: 'u-1',
  ...over,
});

const respond = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }) as unknown as Response;

/** The usage row handed to the recorder by the call under test. */
const recorded = () => recordUsage.mock.calls[0][0] as Record<string, unknown>;

beforeEach(() => {
  configure({ OPENAI_API_KEY: 'sk-test' });
  featureOn.mockResolvedValue(true);
  recordUsage.mockResolvedValue(undefined);
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = realFetch;
});

describe('openaiChat — the AI Features switch', () => {
  it('refuses a switched-off feature without calling OpenAI', async () => {
    featureOn.mockResolvedValue(false);

    const result = await openaiChat(request());

    expect(featureOn).toHaveBeenCalledWith('moderation.pod');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      code: 'DISABLED',
      status: 0,
      message: expect.stringContaining('switched off'),
      model: 'gpt-4o-mini',
    });
  });

  it('records the refused call as SKIPPED with zero tokens against its feature', async () => {
    featureOn.mockResolvedValue(false);

    await openaiChat(request({ task: 'support.assistant' }));

    expect(recordUsage).toHaveBeenCalledTimes(1);
    expect(recorded()).toMatchObject({
      task: 'support.assistant',
      task_label: OPENAI_TASKS['support.assistant'].label,
      module: 'Support',
      status: 'SKIPPED',
      http_status: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      detail: 'pod-42',
      user_id: 'u-1',
      error_message: expect.stringContaining('AI Features'),
      response_preview: '',
    });
  });

  it('says DISABLED, not NOT_CONFIGURED, when the feature is off and no key is set either', async () => {
    configure({});
    featureOn.mockResolvedValue(false);

    const result = await openaiChat(request());

    expect(result).toMatchObject({ ok: false, code: 'DISABLED' });
  });

  it('reports the pinned model on the refused call, so the row names what would have run', async () => {
    featureOn.mockResolvedValue(false);

    const result = await openaiChat(request({ model: 'gpt-4o' }));

    expect(result.model).toBe('gpt-4o');
    expect(recorded()).toMatchObject({ model: 'gpt-4o' });
  });
});

describe('openaiChat — when the feature is on', () => {
  it('reports NOT_CONFIGURED and records SKIPPED when no key is set', async () => {
    configure({ OPENAI_API_KEY: '   ' });

    const result = await openaiChat(request());

    expect(result).toMatchObject({ ok: false, code: 'NOT_CONFIGURED', status: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(recorded()).toMatchObject({ status: 'SKIPPED', error_message: expect.stringContaining('Tech portal') });
  });

  it('posts to the configured base and model, and records the tokens of a success', async () => {
    configure({
      OPENAI_API_KEY: 'sk-test',
      OPENAI_BASE_URL: 'https://proxy.example/v1/',
      OPENAI_MODEL: 'gpt-4.1-mini',
    });
    fetchMock.mockResolvedValue(
      respond(200, {
        choices: [{ message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15 },
      }),
    );

    const result = await openaiChat(request({ temperature: 0, max_tokens: 50, json: true }));

    expect(result).toEqual({ ok: true, content: '{"ok":true}', model: 'gpt-4.1-mini' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://proxy.example/v1/chat/completions');
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'gpt-4.1-mini',
      messages: request().messages,
      temperature: 0,
      max_tokens: 50,
      response_format: { type: 'json_object' },
    });
    expect(recorded()).toMatchObject({
      status: 'SUCCESS',
      http_status: 200,
      prompt_tokens: 12,
      completion_tokens: 3,
      total_tokens: 15,
      // The system half is the same every call; the preview keeps the half that differed.
      request_preview: 'user: Is this pod fine?',
    });
  });

  it('previews a vision call as its text plus an image count', async () => {
    fetchMock.mockResolvedValue(respond(200, { choices: [{ message: { content: 'fine' } }] }));

    await openaiChat(
      request({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Folder: /pods' },
              { type: 'image_url', image_url: { url: 'https://x/a.jpg' } },
            ],
          },
          { role: 'assistant', content: { note: 'object' } },
        ],
      }),
    );

    expect(recorded().request_preview).toBe('user: Folder: /pods\n[1 image(s)]\n\nassistant: {"note":"object"}');
  });

  it('reports NETWORK with the real transport reason when the request never completed', async () => {
    const cause = Object.assign(new Error('getaddrinfo failed'), { code: 'ENOTFOUND' });
    fetchMock.mockRejectedValue(Object.assign(new TypeError('fetch failed'), { cause }));

    const result = await openaiChat(request());

    expect(result).toMatchObject({ ok: false, code: 'NETWORK', status: 0 });
    expect(result.ok ? '' : result.message).toContain('ENOTFOUND');
    expect(recorded()).toMatchObject({ status: 'FAILED', http_status: 0 });
  });

  it('keeps the error message of a throw that is not a transport failure', async () => {
    fetchMock.mockRejectedValue(new Error('aborted by caller'));

    const result = await openaiChat(request());

    expect(result).toMatchObject({ ok: false, code: 'NETWORK', message: 'aborted by caller' });
  });

  it('reports UPSTREAM with OpenAI’s own error message and status', async () => {
    fetchMock.mockResolvedValue(respond(429, { error: { message: 'Rate limit reached' } }));

    const result = await openaiChat(request());

    expect(result).toMatchObject({ ok: false, code: 'UPSTREAM', status: 429, message: 'Rate limit reached' });
    expect(recorded()).toMatchObject({ status: 'FAILED', http_status: 429 });
  });

  it('falls back to the raw body when an upstream error is not JSON', async () => {
    fetchMock.mockResolvedValue(respond(502, 'Bad Gateway'));

    const result = await openaiChat(request());

    expect(result).toMatchObject({ ok: false, code: 'UPSTREAM', message: 'Bad Gateway' });
  });

  it('reports EMPTY, and still records the tokens a refusal burned', async () => {
    fetchMock.mockResolvedValue(
      respond(200, { choices: [{ message: { content: '' } }], usage: { total_tokens: 7 } }),
    );

    const result = await openaiChat(request());

    expect(result).toMatchObject({ ok: false, code: 'EMPTY', status: 200 });
    expect(recorded()).toMatchObject({ status: 'FAILED', total_tokens: 7 });
  });

  it('never fails the call because its usage row could not be written', async () => {
    recordUsage.mockRejectedValue(new Error('db down'));
    fetchMock.mockResolvedValue(respond(200, { choices: [{ message: { content: 'hi' } }] }));

    await expect(openaiChat(request())).resolves.toMatchObject({ ok: true, content: 'hi' });
  });
});
