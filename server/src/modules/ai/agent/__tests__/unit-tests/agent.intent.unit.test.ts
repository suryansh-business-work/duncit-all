/**
 * The Agent console's planner: a sentence becomes an action from a fixed menu.
 *
 * The model is untrusted — an action off the menu is NONE, the count is
 * clamped — and a refused call raises the code the console branches on. A
 * feature switched off in AI Features says so (AI_FEATURE_DISABLED) rather than
 * blaming the provider or the key.
 */
jest.mock('@modules/ai/prompt/prompt.service', () => ({ resolvePrompt: jest.fn() }));
jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));

import { logs } from '@observability/log';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { planFromMessage } from '../../agent.intent';
import { MAX_BATCH } from '../../agent.types';

const prompt = resolvePrompt as unknown as jest.Mock;
const chat = openaiChat as unknown as jest.Mock;

const answer = (body: Record<string, unknown>) =>
  chat.mockResolvedValue({ ok: true, content: JSON.stringify(body), model: 'gpt-4o-mini' });

const refused = (code: string, message = 'refused') =>
  chat.mockResolvedValue({ ok: false, code, status: 0, message, model: 'gpt-4o-mini' });

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (err) {
    return (err as { extensions?: { code?: string }; message: string });
  }
  throw new Error('expected the plan to be refused');
};

beforeEach(() => {
  prompt.mockResolvedValue({ content: 'AGENT SYSTEM', model: 'gpt-4o-mini' });
});

describe('planFromMessage — refused calls', () => {
  it('raises AI_FEATURE_DISABLED when the agent console is switched off', async () => {
    refused('DISABLED', 'switched off');

    const error = await codeOf(planFromMessage('make 3 pods', [], 'u-1'));

    expect(error.extensions?.code).toBe('AI_FEATURE_DISABLED');
    expect(error.message).toContain('switched off in the AI portal');
  });

  it('raises AI_NOT_CONFIGURED when no key is set', async () => {
    refused('NOT_CONFIGURED', 'no key');

    const error = await codeOf(planFromMessage('hi', null, 'u-1'));

    expect(error.extensions?.code).toBe('AI_NOT_CONFIGURED');
    expect(error.message).toBe('no key');
  });

  it.each(['NETWORK', 'UPSTREAM', 'EMPTY'])('raises AI_UPSTREAM_ERROR on %s', async (code) => {
    refused(code, 'down');

    const error = await codeOf(planFromMessage('hi', undefined, 'u-1'));

    expect(error.extensions?.code).toBe('AI_UPSTREAM_ERROR');
  });

  it('raises AI_INVALID_JSON when the plan is not JSON, and logs it', async () => {
    const logError = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    chat.mockResolvedValue({ ok: true, content: 'not json', model: 'gpt-4o-mini' });

    const error = await codeOf(planFromMessage('hi', [], 'u-1'));

    expect(error.extensions?.code).toBe('AI_INVALID_JSON');
    expect(logError).toHaveBeenCalledWith('agent', 'plan', expect.objectContaining({ error: expect.any(Error) }));
    logError.mockRestore();
  });
});

describe('planFromMessage — reading the plan', () => {
  it('accepts an action from the menu, case-insensitively, with its count and topic', async () => {
    answer({ action: 'create_pods', count: 3, topic: '  Board games  ', reply: ' On it ' });

    await expect(planFromMessage('3 board game pods', [], 'u-1')).resolves.toEqual({
      action: 'CREATE_PODS',
      count: 3,
      topic: 'Board games',
      reply: 'On it',
    });
  });

  it('treats an action off the menu as NONE with nothing to create', async () => {
    answer({ action: 'DELETE_EVERYTHING', count: 50, topic: 'x', reply: 'ok' });

    const plan = await planFromMessage('wipe it', [], 'u-1');

    expect(plan.action).toBe('NONE');
    expect(plan.count).toBe(0);
  });

  it.each([
    [999, MAX_BATCH],
    [0, 1],
    [-4, 1],
    ['abc', 1],
    [2.9, 2],
  ])('clamps a count of %p to %p', async (count, expected) => {
    answer({ action: 'CREATE_CLUBS', count, topic: 't', reply: 'r' });

    const plan = await planFromMessage('clubs', [], 'u-1');

    expect(plan.count).toBe(expected);
  });

  it('trims the topic to a title-sized length and ignores fields that are not text', async () => {
    answer({ action: 'CREATE_CLUBS', count: 1, topic: 'x'.repeat(200), reply: { nested: true } });

    const plan = await planFromMessage('clubs', [], 'u-1');

    expect(plan.topic).toHaveLength(60);
    expect(plan.reply).toBe('');
  });

  it('sends the recent thread newest-last, skipping empty turns, attributed to the agent task', async () => {
    answer({ action: 'NONE', reply: 'hello' });
    const history = Array.from({ length: 10 }, (_, index) => ({
      role: index % 2 === 0 ? ('USER' as const) : ('AGENT' as const),
      content: `turn ${index}`,
    }));

    await planFromMessage('latest', [...history, { role: 'USER', content: '   ' }], 'u-9');

    const [req] = chat.mock.calls[0] as [{ task: string; user_id: string; messages: { role: string; content: string }[] }];
    expect(req.task).toBe('agent.console');
    expect(req.user_id).toBe('u-9');
    // System turn, the last 8 non-empty turns, then the new message.
    expect(req.messages).toHaveLength(10);
    expect(req.messages[0]).toEqual({ role: 'system', content: 'AGENT SYSTEM' });
    expect(req.messages[1]).toEqual({ role: 'user', content: 'turn 2' });
    expect(req.messages[2]).toEqual({ role: 'assistant', content: 'turn 3' });
    expect(req.messages.at(-1)).toEqual({ role: 'user', content: 'latest' });
  });
});
