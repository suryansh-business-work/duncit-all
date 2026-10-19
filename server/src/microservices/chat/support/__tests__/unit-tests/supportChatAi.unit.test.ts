const env: Record<string, string> = {
  OPENAI_API_KEY: '',
  OPENAI_BASE_URL: '',
  OPENAI_MODEL: '',
};
jest.mock('@config/runtimeEnv', () => ({
  getRuntimeEnvValue: jest.fn((k: string) => Promise.resolve(env[k] ?? '')),
}));

import { aiSupportReply, isOpenAiConfigured } from '../../supportChat.ai';

function mockFetchJson(content: string, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    text: async () => 'error-body',
    json: async () => ({ choices: [{ message: { content } }] }),
  }) as unknown as typeof fetch;
}

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  env.OPENAI_API_KEY = '';
});

describe('aiSupportReply', () => {
  it('reports unconfigured + hands off when there is no API key', async () => {
    expect(await isOpenAiConfigured()).toBe(false);
    expect(await aiSupportReply([{ role: 'user', content: 'hi' }])).toEqual({
      reply: '',
      handoff: true,
    });
  });

  it('hands off when history is empty', async () => {
    env.OPENAI_API_KEY = 'sk-test';
    expect(await aiSupportReply([])).toEqual({ reply: '', handoff: true });
  });

  it('returns the model reply and its handoff flag', async () => {
    env.OPENAI_API_KEY = 'sk-test';
    mockFetchJson(JSON.stringify({ reply: 'Sure, here is how.', handoff: false }));
    expect(await aiSupportReply([{ role: 'user', content: 'how to join' }])).toEqual({
      reply: 'Sure, here is how.',
      handoff: false,
    });
  });

  it('treats an empty reply as a handoff', async () => {
    env.OPENAI_API_KEY = 'sk-test';
    mockFetchJson(JSON.stringify({ reply: '   ', handoff: false }));
    expect(await aiSupportReply([{ role: 'user', content: 'x' }])).toEqual({
      reply: '',
      handoff: true,
    });
  });

  it('hands off on an HTTP error', async () => {
    env.OPENAI_API_KEY = 'sk-test';
    mockFetchJson('', false, 500);
    expect(await aiSupportReply([{ role: 'user', content: 'x' }])).toEqual({
      reply: '',
      handoff: true,
    });
  });

  it('hands off when the response is not valid JSON', async () => {
    env.OPENAI_API_KEY = 'sk-test';
    mockFetchJson('not json at all');
    expect(await aiSupportReply([{ role: 'user', content: 'x' }])).toEqual({
      reply: '',
      handoff: true,
    });
  });
});
