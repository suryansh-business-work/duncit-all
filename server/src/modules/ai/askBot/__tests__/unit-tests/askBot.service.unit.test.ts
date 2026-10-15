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
