/**
 * Ask Bot availability and its refused calls.
 *
 * A bot is unavailable for one of two reasons the console words differently:
 * no OpenAI key (fixed in the Tech portal) or the feature switched off in AI
 * portal > AI Features. A missing key wins — switching the feature on would not
 * make the bot work. A question asked while the feature is off raises
 * AI_FEATURE_DISABLED rather than blaming the provider.
 */
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@modules/ai/aiFeature/aiFeature.guard', () => ({ isAiFeatureEnabled: jest.fn() }));
jest.mock('@modules/ai/prompt/prompt.service', () => ({ resolvePrompt: jest.fn() }));
jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));
jest.mock('@modules/access/user/effective-roles', () => ({ effectiveRoleKeys: jest.fn() }));

import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { isAiFeatureEnabled } from '@modules/ai/aiFeature/aiFeature.guard';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { effectiveRoleKeys } from '@modules/access/user/effective-roles';
import { logs } from '@observability/log';
import { chat, listBots } from '../../askBot.service';
import { ASK_BOTS } from '../../askBot.bots';

const env = getRuntimeEnvValue as unknown as jest.Mock;
const featureOn = isAiFeatureEnabled as unknown as jest.Mock;
const prompt = resolvePrompt as unknown as jest.Mock;
const openai = openaiChat as unknown as jest.Mock;
const roles = effectiveRoleKeys as unknown as jest.Mock;

const refused = (code: string, message = 'refused') =>
  openai.mockResolvedValue({ ok: false, code, status: 0, message, model: 'gpt-4o-mini' });

const thrown = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (err) {
    return err as { message: string; extensions?: { code?: string } };
  }
  throw new Error('expected the question to be refused');
};

beforeEach(() => {
  env.mockResolvedValue('sk-test');
  featureOn.mockResolvedValue(true);
  prompt.mockResolvedValue({ content: 'NAV SYSTEM', model: 'gpt-4o-mini' });
  roles.mockResolvedValue([]);
});

describe('listBots', () => {
  it('lists every bot as available when a key is set and the feature is on', async () => {
    const bots = await listBots();

    expect(featureOn).toHaveBeenCalledWith('askbot.navigation');
    expect(bots).toHaveLength(ASK_BOTS.length);
    for (const bot of bots) {
      expect(bot).toMatchObject({ is_available: true, unavailable_reason: null });
    }
  });

  it('says DISABLED when the feature is switched off in the AI portal', async () => {
    featureOn.mockResolvedValue(false);

    const bots = await listBots();

    expect(bots.every((bot) => !bot.is_available && bot.unavailable_reason === 'DISABLED')).toBe(true);
  });

  it('says NOT_CONFIGURED for a blank key', async () => {
    env.mockResolvedValue('   ');

    const [bot] = await listBots();

    expect(bot).toMatchObject({ is_available: false, unavailable_reason: 'NOT_CONFIGURED' });
  });

  it('says NOT_CONFIGURED, not DISABLED, when the key is missing and the feature is off too', async () => {
    env.mockResolvedValue('');
    featureOn.mockResolvedValue(false);

    const [bot] = await listBots();

    expect(bot.unavailable_reason).toBe('NOT_CONFIGURED');
  });
});

describe('chat — refused calls', () => {
  const ask = () => chat({ bot_key: 'navigation', message: 'Where are AI features?' }, 'u-1', null);

  it('raises AI_FEATURE_DISABLED when the bot is switched off', async () => {
    refused('DISABLED', 'switched off');

    const error = await thrown(ask());

    expect(error.extensions?.code).toBe('AI_FEATURE_DISABLED');
    expect(error.message).toContain('switched off in the AI portal');
  });

  it('raises AI_NOT_CONFIGURED when no key is set', async () => {
    refused('NOT_CONFIGURED', 'no key');

    const error = await thrown(ask());

    expect(error.extensions?.code).toBe('AI_NOT_CONFIGURED');
  });

  it('raises AI_UPSTREAM_ERROR on a provider failure', async () => {
    refused('UPSTREAM', 'rate limited');

    const error = await thrown(ask());

    expect(error.extensions?.code).toBe('AI_UPSTREAM_ERROR');
    expect(error.message).toBe('rate limited');
  });

  it('refuses an unknown bot and a blank question before calling OpenAI', async () => {
    await expect(thrown(chat({ bot_key: 'nope', message: 'hi' }, null, null))).resolves.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
    await expect(thrown(chat({ bot_key: 'navigation', message: '   ' }, null, null))).resolves.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(openai).not.toHaveBeenCalled();
  });
});

describe('chat — the AI Features page is on the navigation map', () => {
  it('links to /ai-features on the AI portal, with access for an AI manager', async () => {
    roles.mockResolvedValue(['AI_MANAGER']);
    openai.mockResolvedValue({
      ok: true,
      model: 'gpt-4o-mini',
      content: JSON.stringify({
        answer: 'Open AI Features.',
        links: [{ surface: 'ai', path: '/ai-features' }],
        followups: [],
      }),
    });

    const result = await chat({ bot_key: 'navigation', message: 'Turn off moderation AI' }, 'u-1', null);

    expect(result.links).toHaveLength(1);
    expect(result.links[0]).toMatchObject({
      surface_key: 'ai',
      path: '/ai-features',
      label: 'AI Features',
      has_access: true,
    });
  });

  it('marks the link as not accessible for someone without the AI portal role', async () => {
    roles.mockResolvedValue(['CITY_ADMIN']);
    openai.mockResolvedValue({
      ok: true,
      model: 'gpt-4o-mini',
      content: JSON.stringify({ answer: 'Open AI Features.', links: [{ surface: 'ai', path: '/ai-features' }] }),
    });

    const result = await chat({ bot_key: 'navigation', message: 'AI switches' }, 'u-2', null);

    expect(result.links[0].has_access).toBe(false);
  });
});

/** OpenAI answers with this JSON body. */
const replies = (body: unknown) =>
  openai.mockResolvedValue({ ok: true, model: 'gpt-4o-mini', content: JSON.stringify(body) });

describe('chat — the conversation sent to OpenAI', () => {
  it('maps BOT turns to assistant, drops blank turns, keeps the last 8 and appends the question', async () => {
    replies({ answer: 'Sure.' });
    const history = [
      { role: 'USER' as const, content: 'oldest, should be cut' },
      ...Array.from({ length: 8 }, (_, i) => ({
        role: i % 2 === 0 ? ('USER' as const) : ('BOT' as const),
        content: `  turn ${i}  `,
      })),
      { role: 'BOT' as const, content: '   ' },
    ];

    await chat({ bot_key: 'navigation', message: '  Where are payouts?  ', history }, 'u-1', null);

    const { messages } = openai.mock.calls[0][0] as { messages: { role: string; content: string }[] };
    expect(messages[0]).toEqual({ role: 'system', content: 'NAV SYSTEM' });
    expect(messages.slice(1)).toEqual([
      ...Array.from({ length: 8 }, (_, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', content: `turn ${i}` })),
      { role: 'user', content: 'Where are payouts?' },
    ]);
  });

  it('caps an overlong history turn at 1000 characters', async () => {
    replies({ answer: 'Sure.' });

    await chat(
      { bot_key: 'navigation', message: 'next', history: [{ role: 'USER', content: 'y'.repeat(1500) }] },
      'u-1',
      null,
    );

    const { messages } = openai.mock.calls[0][0] as { messages: { content: string }[] };
    expect(messages[1].content).toHaveLength(1000);
  });

  it('bills an anonymous question to no user and looks up no roles', async () => {
    replies({ answer: 'Open the library.', links: [{ surface: 'ai', path: '/library' }] });

    const result = await chat({ bot_key: 'navigation', message: 'Prompts?' }, null, null);

    expect(openai.mock.calls[0][0]).toMatchObject({ task: 'askbot.navigation', user_id: undefined });
    expect(roles).not.toHaveBeenCalled();
    expect(result.links).toEqual([expect.objectContaining({ surface_key: 'ai', path: '/library' })]);
  });
});

describe('chat — links and follow-ups from the reply', () => {
  const ask = () => chat({ bot_key: 'navigation', message: 'Show me around' }, 'u-1', null);

  it('drops invented pages, unknown surfaces, non-text fields and duplicates, and keeps at most 4', async () => {
    replies({
      answer: 'Here you go.',
      links: [
        { surface: 'ai', path: '/does-not-exist' },
        { surface: 'nowhere', path: '/library' },
        { surface: { key: 'ai' }, path: '/library' },
        null,
        { surface: 'ai', path: '/library', label: '  Prompt library  ' },
        { surface: 'ai', path: 'library/' },
        { surface: 'ai', path: '/ai-features', label: 42 },
        { surface: 'ai', path: '/monitoring' },
        { surface: 'ai', path: '/reels' },
        { surface: 'ai', path: '/profile' },
      ],
      followups: ['  First?  ', 7, '', 'Second?', 'Third?', 'Fourth?'],
    });

    const result = await ask();

    expect(result.answer).toBe('Here you go.');
    expect(result.links.map((link) => [link.path, link.label])).toEqual([
      ['/library', 'Prompt library'],
      ['/ai-features', 'AI Features'],
      ['/monitoring', 'Logs'],
      ['/reels', 'Reel Studio'],
    ]);
    expect(result.followups).toEqual(['First?', 'Second?', 'Third?']);
  });

  it('drops a link with no path rather than pointing it at the surface home', async () => {
    replies({
      answer: 'See here.',
      links: [{ surface: 'ai' }, { surface: 'ai', path: '' }, { surface: 'ai', path: 7 }, { surface: 'ai', path: '/library' }],
    });

    const result = await ask();

    expect(result.links.map((link) => link.path)).toEqual(['/library']);
  });

  it('returns no links or follow-ups when the reply carries none as lists', async () => {
    replies({ answer: 'Nothing to link.', links: 'ai /library', followups: 'more?' });

    const result = await ask();

    expect(result).toEqual({ answer: 'Nothing to link.', links: [], followups: [] });
    expect(roles).not.toHaveBeenCalled();
  });

  it('raises AI_INVALID_JSON and logs the bot when the reply is not JSON', async () => {
    const logError = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    openai.mockResolvedValue({ ok: true, model: 'gpt-4o-mini', content: 'Go to the AI portal.' });
    try {
      const error = await thrown(ask());

      expect(error.extensions?.code).toBe('AI_INVALID_JSON');
      expect(logError).toHaveBeenCalledWith(
        'askBot',
        'chat',
        expect.objectContaining({ msg: 'Ask Bot reply was not JSON', bot_key: 'navigation' }),
      );
    } finally {
      logError.mockRestore();
    }
  });

  it('raises AI_EMPTY_RESPONSE for a blank or non-text answer', async () => {
    replies({ answer: '   ', links: [{ surface: 'ai', path: '/library' }] });
    expect((await thrown(ask())).extensions?.code).toBe('AI_EMPTY_RESPONSE');

    replies({ answer: { text: 'hidden in an object' } });
    expect((await thrown(ask())).extensions?.code).toBe('AI_EMPTY_RESPONSE');
  });
});
