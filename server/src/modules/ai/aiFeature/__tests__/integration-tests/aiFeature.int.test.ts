/**
 * AI Features — the catalogue of AI features, the On/Off switch on each, and
 * what each one used and cost, read from the OpenAI usage log.
 *
 * What has to hold:
 *  - every catalogue feature is listed, and one nobody switched is ON;
 *  - usage is summed per feature over the requested range only, with failed,
 *    skipped and unpriced calls counted apart (an unpriced call makes the cost
 *    a floor, so it is only counted when it actually spent tokens);
 *  - the range defaults to 30 days and never exceeds 90;
 *  - switching is an upsert: saving the same state twice leaves one row, and
 *    the guard every OpenAI call reads sees the new state at once;
 *  - an unknown key is NOT_FOUND and writes nothing;
 *  - only SUPER_ADMIN / AI_MANAGER read or switch.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { UserModel } from '@modules/access/user/user.model';
import { OpenAiUsageLogModel } from '@modules/ai/openaiUsage/openaiUsage.model';
import { OPENAI_TASK_KEYS } from '@modules/ai/openaiUsage/openaiUsage.tasks';
import { AiFeatureSettingModel } from '../../aiFeature.model';
import { aiFeatureService } from '../../aiFeature.service';
import { aiFeatureResolvers } from '../../aiFeature.resolver';
import { clearAiFeatureCache, isAiFeatureEnabled } from '../../aiFeature.guard';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const ago = (ms: number) => new Date(Date.now() - ms);

interface UsageSeed {
  task: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  created_at: Date;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost_usd?: number;
  priced?: boolean;
  duration_ms?: number;
}

/** Raw insert: `created_at` is a mongoose timestamp, so it is set on the collection. */
const seedUsage = (rows: UsageSeed[]) =>
  OpenAiUsageLogModel.collection.insertMany(
    rows.map((row) => ({
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cost_usd: 0,
      priced: true,
      duration_ms: 0,
      ...row,
    })),
  );

const seedAdmin = async (first = 'Asha', last = 'Admin') => {
  const id = new Types.ObjectId();
  await UserModel.collection.insertOne({
    _id: id,
    profile: { first_name: first, last_name: last },
    auth: { email: 'asha@duncit.com' },
  });
  return id.toHexString();
};

const errorCode = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (err) {
    return (err as { extensions?: { code?: string } }).extensions?.code;
  }
  throw new Error('expected the call to throw');
};

beforeEach(() => {
  clearAiFeatureCache();
});

describe('aiFeatureService.list', () => {
  it('lists every catalogue feature, switched ON and unused, over 30 days by default', async () => {
    const list = await aiFeatureService.list();

    expect(list.map((feature) => feature.key)).toEqual(OPENAI_TASK_KEYS);
    for (const feature of list) {
      expect(feature.enabled).toBe(true);
      expect(feature.range_days).toBe(30);
      expect(feature.calls).toBe(0);
      expect(feature.cost_usd).toBe(0);
      expect(feature.last_called_at).toBeNull();
      expect(feature.updated_by_name).toBeNull();
      expect(feature.updated_at).toBeNull();
      expect(feature.description).not.toBe('');
      expect(feature.when_off).not.toBe('');
    }
  });

  it('sums one feature’s calls, failures, skips, tokens, cost and duration over the range', async () => {
    const latest = ago(HOUR_MS);
    await seedUsage([
      {
        task: 'moderation.pod',
        status: 'SUCCESS',
        created_at: latest,
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
        cost_usd: 0.0012345678,
        duration_ms: 300,
      },
      { task: 'moderation.pod', status: 'FAILED', created_at: ago(2 * HOUR_MS), duration_ms: 100 },
      // Never left (switched off / no key): no tokens, so it is not "unpriced".
      { task: 'moderation.pod', status: 'SKIPPED', created_at: ago(3 * HOUR_MS), priced: false },
      // Spent tokens on a model with no rate: the cost shown is a floor.
      {
        task: 'moderation.pod',
        status: 'SUCCESS',
        created_at: ago(4 * HOUR_MS),
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
        priced: false,
        duration_ms: 200,
      },
      // Outside the default 30 days.
      { task: 'moderation.pod', status: 'SUCCESS', created_at: ago(40 * DAY_MS), total_tokens: 1000 },
      // Another feature's spend never leaks into this one.
      { task: 'support.assistant', status: 'SUCCESS', created_at: latest, total_tokens: 99, cost_usd: 1 },
    ]);

    const list = await aiFeatureService.list();
    const pod = list.find((feature) => feature.key === 'moderation.pod');
    const support = list.find((feature) => feature.key === 'support.assistant');

    expect(pod).toMatchObject({
      calls: 4,
      failed_calls: 1,
      skipped_calls: 1,
      prompt_tokens: 110,
      completion_tokens: 55,
      total_tokens: 165,
      cost_usd: 0.001235,
      avg_duration_ms: 150,
      unpriced_calls: 1,
      last_called_at: latest.toISOString(),
    });
    expect(support).toMatchObject({ calls: 1, total_tokens: 99, cost_usd: 1, unpriced_calls: 0 });
  });

  it('widens the window when asked, so a 40-day-old call counts at 60 days', async () => {
    await seedUsage([
      { task: 'moderation.pod', status: 'SUCCESS', created_at: ago(40 * DAY_MS), total_tokens: 1000 },
    ]);

    const list = await aiFeatureService.list(60);
    const pod = list.find((feature) => feature.key === 'moderation.pod');

    expect(pod).toMatchObject({ range_days: 60, calls: 1, total_tokens: 1000 });
  });

  it('caps the range at 90 days, however far back is asked for', async () => {
    await seedUsage([
      { task: 'reels.director', status: 'SUCCESS', created_at: ago(89 * DAY_MS), total_tokens: 1 },
      { task: 'reels.director', status: 'SUCCESS', created_at: ago(91 * DAY_MS), total_tokens: 1 },
    ]);

    const list = await aiFeatureService.list(500);
    const reels = list.find((feature) => feature.key === 'reels.director');

    expect(reels).toMatchObject({ range_days: 90, calls: 1 });
  });

  it.each([
    [0, 30],
    [-5, 30],
    [null, 30],
    [Number.NaN, 30],
    [7.9, 7],
    [1, 1],
    [90, 90],
  ])('reads range_days %p as %p days', async (input, expected) => {
    const [first] = await aiFeatureService.list(input);

    expect(first.range_days).toBe(expected);
  });

  it('shows who switched a feature off, and when', async () => {
    const actor = await seedAdmin();
    await aiFeatureService.setEnabled('platform.release_notes', false, actor);

    const list = await aiFeatureService.list();
    const notes = list.find((feature) => feature.key === 'platform.release_notes');
    const others = list.filter((feature) => feature.key !== 'platform.release_notes');

    expect(notes?.enabled).toBe(false);
    expect(notes?.updated_by_name).toBe('Asha Admin');
    expect(notes?.updated_at).toEqual(expect.any(String));
    expect(others.every((feature) => feature.enabled)).toBe(true);
  });
});

describe('aiFeatureService.one', () => {
  it('returns only the asked feature, with its own usage', async () => {
    await seedUsage([
      { task: 'crm.lead_parse', status: 'SUCCESS', created_at: ago(HOUR_MS), total_tokens: 40 },
      { task: 'crm.lead_chat', status: 'SUCCESS', created_at: ago(HOUR_MS), total_tokens: 9 },
    ]);

    const feature = await aiFeatureService.one('crm.lead_parse', 7);

    expect(feature).toMatchObject({
      key: 'crm.lead_parse',
      module: 'CRM',
      range_days: 7,
      calls: 1,
      total_tokens: 40,
      enabled: true,
    });
  });

  it('refuses a key that is not in the catalogue', async () => {
    await expect(errorCode(aiFeatureService.one('not.a.feature'))).resolves.toBe('NOT_FOUND');
  });

  it('does not treat an inherited object property as a feature', async () => {
    await expect(errorCode(aiFeatureService.one('toString'))).resolves.toBe('NOT_FOUND');
  });
});

describe('aiFeatureService.setEnabled', () => {
  it('switches a feature off, and every OpenAI call sees it off at once', async () => {
    const actor = await seedAdmin();
    // Warm the guard's cache with the ON state first.
    await expect(isAiFeatureEnabled('askbot.navigation')).resolves.toBe(true);

    const result = await aiFeatureService.setEnabled('askbot.navigation', false, actor);

    expect(result).toMatchObject({ key: 'askbot.navigation', enabled: false, updated_by_name: 'Asha Admin' });
    await expect(isAiFeatureEnabled('askbot.navigation')).resolves.toBe(false);
    const row = await AiFeatureSettingModel.findOne({ key: 'askbot.navigation' }).lean();
    expect(row).toMatchObject({ enabled: false, updated_by_id: actor, updated_by_name: 'Asha Admin' });
  });

  it('is idempotent: saving the same state twice leaves one row in that state', async () => {
    const actor = await seedAdmin();

    await aiFeatureService.setEnabled('support.mail_reply', false, actor);
    const again = await aiFeatureService.setEnabled('support.mail_reply', false, actor);

    expect(again.enabled).toBe(false);
    await expect(AiFeatureSettingModel.countDocuments({ key: 'support.mail_reply' })).resolves.toBe(1);
  });

  it('switches a feature back on through the same row', async () => {
    const actor = await seedAdmin();
    await aiFeatureService.setEnabled('agent.console', false, actor);

    const result = await aiFeatureService.setEnabled('agent.console', true, actor);

    expect(result.enabled).toBe(true);
    await expect(isAiFeatureEnabled('agent.console')).resolves.toBe(true);
    await expect(AiFeatureSettingModel.countDocuments({})).resolves.toBe(1);
  });

  it('records a blank name for an actor it cannot find, without failing the toggle', async () => {
    const result = await aiFeatureService.setEnabled('ai.rich_text', false, new Types.ObjectId().toHexString());

    expect(result.enabled).toBe(false);
    expect(result.updated_by_name).toBeNull();
  });

  it('refuses an unknown key and writes nothing', async () => {
    const actor = await seedAdmin();

    await expect(errorCode(aiFeatureService.setEnabled('made.up', false, actor))).resolves.toBe('NOT_FOUND');
    await expect(AiFeatureSettingModel.countDocuments({})).resolves.toBe(0);
  });
});

describe('aiFeatureResolvers', () => {
  const { Query, Mutation } = aiFeatureResolvers;

  it.each(['SUPER_ADMIN', 'AI_MANAGER'])('lets %s read the list and one feature', async (role) => {
    const ctx = makeContext({ roles: [role] });

    const list = await Query.aiFeatures(undefined, { range_days: 14 }, ctx);
    const one = await Query.aiFeature(undefined, { key: 'moderation.pod', range_days: 14 }, ctx);

    expect(list).toHaveLength(OPENAI_TASK_KEYS.length);
    expect(list[0].range_days).toBe(14);
    expect(one.key).toBe('moderation.pod');
  });

  it.each(['SUPER_ADMIN', 'AI_MANAGER'])('lets %s switch a feature, attributed to them', async (role) => {
    const id = await seedAdmin('Ravi', 'Ops');
    const ctx = makeContext({ id, roles: [role] });

    const result = await Mutation.setAiFeatureEnabled(undefined, { key: 'moderation.pod', enabled: false }, ctx);

    expect(result).toMatchObject({ enabled: false, updated_by_name: 'Ravi Ops' });
  });

  it('refuses a signed-out caller', () => {
    const ctx = makeContext(null);

    expect(() => Query.aiFeatures(undefined, {}, ctx)).toThrow('Not authenticated');
    expect(() => Query.aiFeature(undefined, { key: 'moderation.pod' }, ctx)).toThrow('Not authenticated');
    expect(() =>
      Mutation.setAiFeatureEnabled(undefined, { key: 'moderation.pod', enabled: false }, ctx),
    ).toThrow('Not authenticated');
  });

  it.each(['LOGS_MANAGER', 'CITY_ADMIN', 'FINANCE_MANAGER'])(
    'refuses %s, and writes no switch',
    async (role) => {
      const ctx = makeContext({ roles: [role] });

      expect(() => Query.aiFeatures(undefined, {}, ctx)).toThrow('Access Denied');
      expect(() => Query.aiFeature(undefined, { key: 'moderation.pod' }, ctx)).toThrow('Access Denied');
      expect(() =>
        Mutation.setAiFeatureEnabled(undefined, { key: 'moderation.pod', enabled: false }, ctx),
      ).toThrow('Access Denied');
      await expect(AiFeatureSettingModel.countDocuments({})).resolves.toBe(0);
    },
  );
});
