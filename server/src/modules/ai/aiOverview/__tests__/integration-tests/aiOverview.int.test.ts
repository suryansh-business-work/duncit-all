/**
 * The AI portal Dashboard against a real database.
 *
 * What has to hold:
 *  - an empty platform answers zeros everywhere — no errors, no baseline
 *    (every change is null), and a gap-free series of zero days;
 *  - the window and the previous window of the same length are summed apart,
 *    and each headline change is computed against the previous one (the error
 *    rate in points);
 *  - the daily series covers every day of the window, a day with no calls
 *    being zeros, and counts the distinct people active each day;
 *  - models, features, areas and people are ranked from the window only, and a
 *    person is named at read time with nothing but their name;
 *  - AI Monitoring and Automation are summarised from their own collections
 *    (test runs and older runs left out);
 *  - the latest calls never carry the prompt or the answer;
 *  - only SUPER_ADMIN and AI_MANAGER may read it.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { getAppTimeZone } from '@utils/app-time';
import { formatInTimeZone } from 'date-fns-tz';
import { UserModel } from '@modules/access/user/user.model';
import { OpenAiUsageLogModel } from '@modules/ai/openaiUsage/openaiUsage.model';
import { OPENAI_TASK_KEYS } from '@modules/ai/openaiUsage/openaiUsage.tasks';
import { MediaScanLogModel } from '@modules/ai/aiMonitoring/aiMonitoring.model';
import { AutomationFlowModel, AutomationRunModel } from '@modules/ai/automation/automation.model';
import { AiFeatureSettingModel } from '@modules/ai/aiFeature/aiFeature.model';
import { clearAiFeatureCache } from '@modules/ai/aiFeature/aiFeature.guard';
import { aiOverviewService } from '../../aiOverview.service';
import { aiOverviewResolvers } from '../../aiOverview.resolver';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const ago = (ms: number) => new Date(Date.now() - ms);
const dayOf = (date: Date) => formatInTimeZone(date, getAppTimeZone(), 'yyyy-MM-dd');

interface UsageSeed {
  task?: string;
  status?: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  created_at: Date;
  model?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost_usd?: number;
  priced?: boolean;
  duration_ms?: number;
  user_id?: string;
  error_message?: string;
}

/** Raw insert: `created_at` is a mongoose timestamp, so it is set on the collection. */
const seedUsage = (rows: UsageSeed[]) =>
  OpenAiUsageLogModel.collection.insertMany(
    rows.map((row) => ({
      task: 'moderation.pod',
      task_label: 'Pod moderation scan',
      module: 'Moderation',
      status: 'SUCCESS',
      model: 'gpt-4o-mini',
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cost_usd: 0,
      priced: true,
      duration_ms: 0,
      request_preview: 'secret prompt text',
      response_preview: 'secret answer text',
      error_message: '',
      ...row,
    })),
  );

const seedUser = async (first: string, last: string) => {
  const id = new Types.ObjectId();
  await UserModel.collection.insertOne({
    _id: id,
    profile: { first_name: first, last_name: last },
    auth: { email: `${first.toLowerCase()}@duncit.com` },
    phone: '+919999999999',
  });
  return id.toHexString();
};

beforeEach(() => clearAiFeatureCache());

describe('aiOverviewService.dashboard', () => {
  it('answers zeros, no baseline and a zero-filled 30-day series on an empty platform', async () => {
    const d = await aiOverviewService.dashboard();

    expect(d.range_days).toBe(30);
    expect(d.totals).toMatchObject({ calls: 0, cost_usd: 0, error_rate: 0, active_users: 0, avg_duration_ms: 0 });
    expect(d.previous.calls).toBe(0);
    expect(d.change).toEqual({
      calls: null,
      cost_usd: null,
      total_tokens: null,
      active_users: null,
      avg_duration_ms: null,
      error_rate_points: null,
    });
    expect(d.series.length).toBeGreaterThanOrEqual(30);
    expect(d.series.every((day) => day.calls === 0 && day.active_users === 0)).toBe(true);
    expect(d.series.at(-1)?.date).toBe(dayOf(new Date()));
    expect(d.by_model).toEqual([]);
    expect(d.by_feature).toEqual([]);
    expect(d.by_module).toEqual([]);
    expect(d.top_users).toEqual([]);
    expect(d.recent).toEqual([]);
    expect(d.features_total).toBe(OPENAI_TASK_KEYS.length);
    expect(d.features_enabled).toBe(OPENAI_TASK_KEYS.length);
    expect(d.monitoring).toMatchObject({ scanned: 0, flagged: 0, blocked: 0, failed: 0 });
    expect(d.monitoring.by_risk.map((count) => count.key)).toEqual(['PENDING', 'LOW', 'MEDIUM', 'HIGH']);
    expect(d.automation).toMatchObject({ runs: 0, completed: 0, failed: 0, in_progress: 0, active_flows: 0, total_flows: 0 });
  });

  it('sums the window and the previous window apart and compares them', async () => {
    const asha = await seedUser('Asha', 'Rao');
    const ravi = await seedUser('Ravi', 'Kumar');
    await seedUsage([
      // This 7-day window: 4 calls, 1 failed, 2 people.
      { created_at: ago(HOUR_MS), total_tokens: 300, prompt_tokens: 200, completion_tokens: 100, cost_usd: 0.3, duration_ms: 1000, user_id: asha },
      { created_at: ago(2 * HOUR_MS), total_tokens: 100, cost_usd: 0.1, duration_ms: 3000, user_id: asha },
      { created_at: ago(3 * DAY_MS), total_tokens: 100, cost_usd: 0.1, duration_ms: 2000, user_id: ravi },
      { created_at: ago(3 * DAY_MS), status: 'FAILED', model: 'gpt-4o', duration_ms: 2000, error_message: 'timeout' },
      // The previous 7 days: 2 calls, no failures, 1 person.
      { created_at: ago(8 * DAY_MS), total_tokens: 100, cost_usd: 0.2, duration_ms: 1000, user_id: asha },
      { created_at: ago(9 * DAY_MS), total_tokens: 100, cost_usd: 0.2, duration_ms: 1000 },
      // Older than both windows: counted nowhere.
      { created_at: ago(20 * DAY_MS), total_tokens: 999, cost_usd: 9 },
    ]);

    const d = await aiOverviewService.dashboard(7);

    expect(d.totals).toMatchObject({
      calls: 4,
      success_calls: 3,
      failed_calls: 1,
      skipped_calls: 0,
      error_rate: 25,
      total_tokens: 500,
      prompt_tokens: 200,
      completion_tokens: 100,
      cost_usd: 0.5,
      avg_duration_ms: 2000,
      active_users: 2,
    });
    expect(d.previous).toMatchObject({ calls: 2, total_tokens: 200, cost_usd: 0.4, avg_duration_ms: 1000, active_users: 1, error_rate: 0 });
    expect(d.change).toEqual({
      calls: 100,
      cost_usd: 25,
      total_tokens: 150,
      active_users: 100,
      avg_duration_ms: 100,
      error_rate_points: 25,
    });
  });

  it('fills every day of the window and counts the people active each day', async () => {
    const asha = await seedUser('Asha', 'Rao');
    const ravi = await seedUser('Ravi', 'Kumar');
    const threeDaysAgo = ago(3 * DAY_MS);
    await seedUsage([
      { created_at: threeDaysAgo, user_id: asha, cost_usd: 0.25, total_tokens: 50 },
      { created_at: threeDaysAgo, user_id: asha, status: 'SKIPPED' },
      { created_at: threeDaysAgo, user_id: ravi, status: 'FAILED' },
    ]);

    const d = await aiOverviewService.dashboard(7);
    const dates = d.series.map((day) => day.date);
    const busy = d.series.find((day) => day.date === dayOf(threeDaysAgo));

    expect(new Set(dates).size).toBe(dates.length);
    expect([...dates].sort((a, b) => a.localeCompare(b))).toEqual(dates);
    expect(dates.at(-1)).toBe(dayOf(new Date()));
    expect(busy).toMatchObject({ calls: 3, success_calls: 1, failed_calls: 1, skipped_calls: 1, cost_usd: 0.25, total_tokens: 50, active_users: 2 });
    expect(d.series.filter((day) => day.calls > 0)).toHaveLength(1);
  });

  it('ranks models, features, areas and people from the window, naming people only', async () => {
    const asha = await seedUser('Asha', 'Rao');
    const ghost = new Types.ObjectId().toHexString();
    await seedUsage([
      { created_at: ago(HOUR_MS), model: 'gpt-4o', cost_usd: 1, total_tokens: 10, duration_ms: 500, user_id: asha },
      { created_at: ago(HOUR_MS), model: 'gpt-4o', status: 'FAILED', duration_ms: 1500, user_id: asha },
      { created_at: ago(HOUR_MS), model: 'gpt-4o-mini', task: 'support.assistant', task_label: 'Support chat reply', module: 'Support', cost_usd: 0.5, user_id: ghost },
      { created_at: ago(40 * DAY_MS), model: 'old-model', cost_usd: 5 },
    ]);
    await AiFeatureSettingModel.create({ key: 'crm.lead_chat', enabled: false });

    const d = await aiOverviewService.dashboard(7);

    expect(d.by_model).toEqual([
      { model: 'gpt-4o', calls: 2, failed_calls: 1, failure_rate: 50, total_tokens: 10, cost_usd: 1, avg_duration_ms: 1000 },
      { model: 'gpt-4o-mini', calls: 1, failed_calls: 0, failure_rate: 0, total_tokens: 0, cost_usd: 0.5, avg_duration_ms: 0 },
    ]);
    expect(d.by_feature.map((feature) => [feature.key, feature.calls])).toEqual(
      expect.arrayContaining([
        ['moderation.pod', 2],
        ['support.assistant', 1],
      ]),
    );
    expect(d.by_feature).toHaveLength(2);
    expect(d.by_module.map((area) => area.module)).toEqual(['Moderation', 'Support']);
    expect(d.features_enabled).toBe(OPENAI_TASK_KEYS.length - 1);
    expect(d.top_users).toEqual([
      { user_id: asha, name: 'Asha Rao', calls: 2, total_tokens: 10, cost_usd: 1 },
      // A deleted account still counts, with a blank name.
      { user_id: ghost, name: '', calls: 1, total_tokens: 0, cost_usd: 0.5 },
    ]);
    expect(JSON.stringify(d.top_users)).not.toContain('duncit.com');
    expect(JSON.stringify(d.top_users)).not.toContain('+91');
  });

  it('summarises AI Monitoring and live automation runs from their own collections', async () => {
    await MediaScanLogModel.collection.insertMany([
      { url: 'a', risk: 'HIGH', status: 'COMPLETED', action: 'BLOCKED', created_at: ago(HOUR_MS) },
      { url: 'b', risk: 'MEDIUM', status: 'COMPLETED', action: 'FLAGGED', created_at: ago(HOUR_MS) },
      { url: 'c', risk: 'PENDING', status: 'FAILED', action: 'NONE', created_at: ago(HOUR_MS) },
      { url: 'd', risk: 'LOW', status: 'COMPLETED', action: 'ALLOWED', created_at: ago(40 * DAY_MS) },
    ]);
    const flowId = new Types.ObjectId();
    await AutomationFlowModel.collection.insertMany([
      { _id: flowId, name: 'Welcome', channel: 'WHATSAPP', status: 'ACTIVE' },
      { name: 'Draft', channel: 'EMAIL', status: 'DRAFT' },
    ]);
    const run = (over: Record<string, unknown>) => ({ flow_id: flowId, channel: 'WHATSAPP', mode: 'LIVE', status: 'COMPLETED', created_at: ago(HOUR_MS), ...over });
    await AutomationRunModel.collection.insertMany([
      run({}),
      run({ status: 'FAILED', channel: 'EMAIL' }),
      run({ status: 'WAITING_REPLY' }),
      run({ mode: 'TEST', status: 'FAILED' }),
      run({ created_at: ago(40 * DAY_MS) }),
    ]);

    const d = await aiOverviewService.dashboard(7);

    expect(d.monitoring).toEqual({
      scanned: 3,
      flagged: 1,
      blocked: 1,
      failed: 1,
      by_risk: [
        { key: 'PENDING', count: 1 },
        { key: 'LOW', count: 0 },
        { key: 'MEDIUM', count: 1 },
        { key: 'HIGH', count: 1 },
      ],
    });
    expect(d.automation).toMatchObject({ runs: 3, completed: 1, failed: 1, in_progress: 1, active_flows: 1, total_flows: 2 });
    expect(d.automation.by_channel).toEqual([
      { key: 'WHATSAPP', count: 2 },
      { key: 'EMAIL', count: 1 },
    ]);
  });

  it('lists the latest calls newest first, without the prompt or the answer', async () => {
    const rows: UsageSeed[] = Array.from({ length: 12 }, (_, index) => ({ created_at: ago((index + 1) * HOUR_MS), cost_usd: index }));
    rows[0] = { ...rows[0], status: 'FAILED', error_message: 'x'.repeat(400) };
    await seedUsage(rows);

    const d = await aiOverviewService.dashboard();

    expect(d.recent).toHaveLength(10);
    expect(d.recent[0]).toMatchObject({ task: 'moderation.pod', task_label: 'Pod moderation scan', status: 'FAILED', cost_usd: 0 });
    expect(d.recent[0].error_message.length).toBe(160);
    expect(d.recent.map((row) => row.cost_usd)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(JSON.stringify(d.recent)).not.toContain('secret');
  });

  it('caps the range at 90 days and falls back to 30 for nonsense', async () => {
    await expect(aiOverviewService.dashboard(365)).resolves.toMatchObject({ range_days: 90 });
    await expect(aiOverviewService.dashboard(0)).resolves.toMatchObject({ range_days: 30 });
  });
});

describe('aiOverviewResolvers', () => {
  const { Query } = aiOverviewResolvers;

  it.each(['SUPER_ADMIN', 'AI_MANAGER'])('lets %s read the dashboard', async (role) => {
    const d = await Query.aiOverviewDashboard(undefined, { range_days: 7 }, makeContext({ roles: [role] }));

    expect(d.range_days).toBe(7);
  });

  it.each([null, 'CITY_ADMIN', 'LOGS_MANAGER'])('refuses the dashboard to %s', (role) => {
    const ctx = makeContext(role ? { roles: [role] } : null);

    expect(() => Query.aiOverviewDashboard(undefined, {}, ctx)).toThrow(role ? 'Access Denied' : 'Not authenticated');
  });
});
