/**
 * An agent run against a real database: the plan step, one step per action
 * through the tool registry, the report, and the cost — all on one AGENT row
 * in the marketing run log. Only the AI funnel and the two network-bound
 * services (comment review, health check) are faked; posts and ideas are
 * real rows, so what the Content planner creates is checked as stored.
 */
jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));
jest.mock('@services/anthropic/anthropic.client', () => ({ claudeDefaultModel: jest.fn(async () => 'claude-test') }));
jest.mock('@modules/crm/marketing/social/social.ai', () => ({ analyzePendingComments: jest.fn() }));
jest.mock('@modules/crm/marketing/social/social.health', () => ({ runHealthChecks: jest.fn() }));
jest.mock('@modules/crm/marketing/social/social.ideas', () => ({ socialIdeasService: { generate: jest.fn() } }));

import { Types } from 'mongoose';
import { openaiChat } from '@services/openai/openai.client';
import { OpenAiModelPriceModel } from '@modules/ai/openaiUsage/openaiUsage.model';
import { analyzePendingComments } from '@modules/crm/marketing/social/social.ai';
import { runHealthChecks } from '@modules/crm/marketing/social/social.health';
import { socialIdeasService } from '@modules/crm/marketing/social/social.ideas';
import { SocialAccountModel } from '../../../social/social.model';
import { SocialScheduledPostModel } from '../../../social/social.publish.model';
import { MarketingRunModel } from '../../../runs/marketingRun.model';
import { cancelRun, marketingRunService } from '../../../runs/marketingRun.service';
import { MarketingAgentConfigModel } from '../../agent.model';
import { agentActor, runMarketingAgent, startMarketingAgent } from '../../agent.runner';
import { AGENTS } from '../../agent.catalog';

const m = (fn: unknown) => fn as jest.Mock;
const USER = new Types.ObjectId().toHexString();
const actor = { kind: 'USER' as const, id: USER, name: 'Asha Marketing', email: 'asha@duncit.test' };
const HOUR = 3_600_000;
const USAGE = { prompt_tokens: 1000, completion_tokens: 100, total_tokens: 1100 };

const plan = (summary: string, actions: unknown[], model = 'claude-test', usage = USAGE) =>
  m(openaiChat).mockResolvedValue({ ok: true, content: JSON.stringify({ summary, actions }), model, usage });

const account = (platform: string, over: Record<string, unknown> = {}) =>
  SocialAccountModel.create({ provider: platform, platform, external_id: `${platform}-${new Types.ObjectId().toHexString()}`, name: `Duncit ${platform}`, ...over });

const future = (hours = 24) => new Date(Date.now() + hours * HOUR).toISOString();

const runOf = async (id: string) => marketingRunService.get(id);
const stepsOf = (run: Awaited<ReturnType<typeof runOf>>) => run.steps.map((s) => [s.key, s.status, s.tool, s.error]);

beforeEach(() => {
  m(analyzePendingComments).mockResolvedValue({ analyzed: 4, flagged: 1, error: null });
  m(runHealthChecks).mockResolvedValue([]);
  m(socialIdeasService.generate).mockResolvedValue([{ id: 'i1', title: 'Pup walk', caption: 'c', hashtags: [], platforms: ['LINKEDIN'], format: 'TEXT' }]);
});

describe('a run that goes to plan', () => {
  it('records the plan, a step per action, the report and the priced cost on one AGENT run', async () => {
    await OpenAiModelPriceModel.create({ model: 'claude-test', input_per_1m: 2, output_per_1m: 10 });
    plan('Review the new comments.', [{ tool: 'comments.analyze', input: {}, why: 'Daily review' }]);

    const outcome = await runMarketingAgent('COMMUNITY_WATCH', 'USER', actor, { user_id: USER });

    expect(outcome).toMatchObject({ status: 'COMPLETED', error: '' });
    const run = await runOf(outcome.run_id);
    expect(run).toMatchObject({
      workflow: 'AGENT',
      name: 'Community watch',
      trigger: 'USER',
      status: 'COMPLETED',
      actor: { kind: 'USER', id: USER, name: 'Asha Marketing' },
      links: { agent_key: 'COMMUNITY_WATCH' },
      parent_run_id: '',
      // 1000 in at $2/M plus 100 out at $10/M.
      cost: { tokens_in: 1000, tokens_out: 100, amount: 0.003, currency: 'USD' },
    });
    expect(stepsOf(run)).toEqual([
      ['plan', 'OK', 'marketing.agent_plan', ''],
      ['action-1', 'OK', 'comments.analyze', ''],
      ['report', 'OK', '', ''],
    ]);
    expect(run.steps[0]).toMatchObject({ label: 'Plan with Claude', output_summary: '1 action(s): Review the new comments.' });
    expect(run.steps[1]).toMatchObject({ label: 'comments.analyze: Daily review', input_summary: '{}' });
    expect(run.steps[1].output_summary).toMatch(/^4 comment\(s\) reviewed, 1 flagged\. No reply was sent: the Meta reply permission is not held/);
    expect(run.steps[2].output_summary).toBe(`Review the new comments.\n1. comments.analyze: ${run.steps[1].output_summary}`);
    expect(analyzePendingComments).toHaveBeenCalledWith(undefined);

    const call = m(openaiChat).mock.calls[0][0];
    expect(call).toMatchObject({ task: 'marketing.agent_plan', model: 'claude-test', json: true, max_tokens: 4000, detail: 'COMMUNITY_WATCH', user_id: USER });
    expect(call.messages[0].content).toContain('You are the Community watch agent');
    expect(call.messages[1].content).toContain('CONNECTED ACCOUNTS:');
  });

  it('records the tokens and an amount of zero for a model the rate card does not price', async () => {
    plan('Check.', [{ tool: 'accounts.health_check', input: {}, why: 'Daily' }], 'claude-unpriced', { prompt_tokens: 50, completion_tokens: 5, total_tokens: 55 });
    const outcome = await runMarketingAgent('ACCOUNT_DOCTOR', 'USER', actor, { user_id: USER });
    expect((await runOf(outcome.run_id)).cost).toEqual({ tokens_in: 50, tokens_out: 5, amount: 0, currency: 'USD' });
  });

  it('answers the run id at once and the outcome when the work is done, carrying the parent run', async () => {
    plan('Check.', [{ tool: 'accounts.health_check', input: {}, why: 'Daily' }]);
    const started = await startMarketingAgent('ACCOUNT_DOCTOR', 'SCHEDULE', agentActor(AGENTS.ACCOUNT_DOCTOR), { parent_run_id: 'orch-1' });
    expect(Types.ObjectId.isValid(started.run_id)).toBe(true);
    const outcome = await started.finished;
    expect(outcome).toEqual({ run_id: started.run_id, status: 'COMPLETED', error: '' });
    expect(await runOf(started.run_id)).toMatchObject({
      trigger: 'SCHEDULE',
      actor: { kind: 'AGENT', id: 'ACCOUNT_DOCTOR', name: 'Account doctor' },
      parent_run_id: 'orch-1',
    });
  });

  it('reports "no actions" when the plan had none, and still completes', async () => {
    plan('Nothing to do today.', []);
    const outcome = await runMarketingAgent('ACCOUNT_DOCTOR', 'USER', actor, { user_id: USER });
    const run = await runOf(outcome.run_id);
    expect(run.status).toBe('COMPLETED');
    expect(stepsOf(run)).toEqual([
      ['plan', 'OK', 'marketing.agent_plan', ''],
      ['report', 'OK', '', ''],
    ]);
    expect(run.steps[1].output_summary).toBe('Nothing to do today.\nNo actions were planned.');
  });
});

describe('a plan that oversteps', () => {
  it('refuses a tool the agent may not use as a FAILED step, runs the rest, and ends PARTIAL', async () => {
    plan('Fix things.', [
      { tool: 'social.create_post', input: { text: 'hi', account_ids: [], scheduled_at: future() }, why: 'Post something' },
      { tool: 'social.delete_everything', input: {}, why: 'Clean up' },
      { tool: 'accounts.health_check', input: { extra: true }, why: 'The real job' },
    ]);
    const outcome = await runMarketingAgent('ACCOUNT_DOCTOR', 'USER', actor, { user_id: USER });
    expect(outcome.status).toBe('PARTIAL');
    const run = await runOf(outcome.run_id);
    expect(stepsOf(run)).toEqual([
      ['plan', 'OK', 'marketing.agent_plan', ''],
      ['action-1', 'FAILED', 'social.create_post', 'Account doctor may not use social.create_post'],
      ['action-2', 'FAILED', 'social.delete_everything', 'Unknown tool "social.delete_everything"'],
      ['action-3', 'OK', 'accounts.health_check', ''],
      ['report', 'OK', '', ''],
    ]);
    expect(run.steps[4].output_summary.split('\n')).toEqual([
      'Fix things.',
      '1. social.create_post: FAILED — Account doctor may not use social.create_post',
      '2. social.delete_everything: FAILED — Unknown tool "social.delete_everything"',
      '3. accounts.health_check: 0 account(s) checked; 0 need a person',
    ]);
    expect(await SocialScheduledPostModel.countDocuments()).toBe(0);
  });

  it('fails a step on a bad input or a service refusal, naming the reason', async () => {
    plan('Review.', [
      { tool: 'comments.analyze', input: { account_id: 'not-an-id' }, why: 'One account' },
      { tool: 'comments.analyze', input: {}, why: 'All' },
    ]);
    m(analyzePendingComments).mockResolvedValue({ analyzed: 0, flagged: 0, error: 'OpenAI is not configured' });
    const outcome = await runMarketingAgent('COMMUNITY_WATCH', 'USER', actor, { user_id: USER });
    expect(outcome.status).toBe('PARTIAL');
    expect(stepsOf(await runOf(outcome.run_id))).toEqual([
      ['plan', 'OK', 'marketing.agent_plan', ''],
      ['action-1', 'FAILED', 'comments.analyze', 'Bad input for comments.analyze: account_id must be an account id'],
      ['action-2', 'FAILED', 'comments.analyze', 'OpenAI is not configured'],
      ['report', 'OK', '', ''],
    ]);
  });
});

describe('a plan that never arrives', () => {
  it('fails the run with the funnel’s message when AI is refused', async () => {
    m(openaiChat).mockResolvedValue({ ok: false, code: 'DISABLED', status: 0, message: 'This AI feature is switched off in the AI portal (AI Features).', model: 'claude-test' });
    const outcome = await runMarketingAgent('ACCOUNT_DOCTOR', 'USER', actor, { user_id: USER });
    expect(outcome).toMatchObject({ status: 'FAILED', error: 'This AI feature is switched off in the AI portal (AI Features).' });
    const run = await runOf(outcome.run_id);
    expect(stepsOf(run)).toEqual([['plan', 'FAILED', 'marketing.agent_plan', 'This AI feature is switched off in the AI portal (AI Features).']]);
    expect(run.cost).toMatchObject({ tokens_in: 0, tokens_out: 0, amount: 0 });
    expect(runHealthChecks).not.toHaveBeenCalled();
  });

  it('fails the run when the answer is not JSON', async () => {
    m(openaiChat).mockResolvedValue({ ok: true, content: 'Happy to help! Here is my plan…', model: 'claude-test', usage: USAGE });
    const outcome = await runMarketingAgent('COMMUNITY_WATCH', 'USER', actor, { user_id: USER });
    expect(outcome).toMatchObject({ status: 'FAILED', error: 'The plan was not valid JSON' });
    expect(analyzePendingComments).not.toHaveBeenCalled();
  });
});

describe('the Content planner', () => {
  it('creates every post waiting for approval at a future time: scheduled where the network takes text, a draft where it needs media', async () => {
    const li = await account('LINKEDIN');
    const ig = await account('INSTAGRAM');
    const at = future(30);
    const draftAt = future(40);
    plan('Three posts for the week.', [
      { tool: 'social.generate_ideas', input: { brief: 'Monsoon pods', platforms: ['LINKEDIN'], count: 3 }, why: 'Stock the board' },
      { tool: 'social.create_post', input: { text: 'Monsoon board games at [venue] this Sunday', account_ids: [String(li._id)], scheduled_at: at }, why: 'LinkedIn takes text' },
      { tool: 'social.create_post', input: { text: 'Reel: pups in the rain', account_ids: [String(ig._id)], scheduled_at: draftAt, mode: 'DRAFT' }, why: 'Instagram needs media' },
      { tool: 'social.create_post', input: { text: 'Too late', account_ids: [String(li._id)], scheduled_at: '2020-01-01T09:00:00.000Z' }, why: 'A slip' },
    ]);

    const outcome = await runMarketingAgent('CONTENT_PLANNER', 'USER', actor, { user_id: USER });

    expect(outcome.status).toBe('PARTIAL');
    const run = await runOf(outcome.run_id);
    expect(stepsOf(run)).toEqual([
      ['plan', 'OK', 'marketing.agent_plan', ''],
      ['action-1', 'OK', 'social.generate_ideas', ''],
      ['action-2', 'OK', 'social.create_post', ''],
      ['action-3', 'OK', 'social.create_post', ''],
      ['action-4', 'FAILED', 'social.create_post', 'Bad input for social.create_post: scheduled_at must be an ISO 8601 date-time in the future'],
      ['report', 'OK', '', ''],
    ]);
    expect(run.steps[5].output_summary.split('\n').slice(0, 3)).toEqual([
      'Three posts for the week.',
      'Posts from this run wait on Marketing › Approvals; nothing went out.',
      '1. social.generate_ideas: 1 idea(s) on the board: Pup walk',
    ]);
    expect(socialIdeasService.generate).toHaveBeenCalledWith({ brief: 'Monsoon pods', platforms: ['LINKEDIN'], count: 3 }, USER);

    const posts = await SocialScheduledPostModel.find().sort({ scheduled_at: 1 }).lean();
    expect(posts).toHaveLength(2);
    expect(posts.map((p) => [p.status, p.needs_approval, p.scheduled_at?.toISOString(), String(p.created_by), p.media])).toEqual([
      ['PENDING_APPROVAL', true, at, USER, []],
      ['DRAFT', true, draftAt, USER, []],
    ]);
    for (const post of posts) expect(post.scheduled_at?.getTime() ?? 0).toBeGreaterThan(Date.now());
    // The scheduled one waits on a real approval run in the person's name.
    expect(posts[0].approval_run_id).not.toBe('');
    expect(await MarketingRunModel.findById(posts[0].approval_run_id).lean()).toMatchObject({ workflow: 'SOCIAL_PUBLISH', status: 'AWAITING_APPROVAL' });
  });

  it('files its posts under the manager who switched it on when it runs on its own, and refuses to write when nobody did', async () => {
    const li = await account('LINKEDIN');
    const post = { tool: 'social.create_post', input: { text: 'Hello', account_ids: [String(li._id)], scheduled_at: future() }, why: 'One post' };
    plan('One post.', [post]);

    const orphan = await runMarketingAgent('CONTENT_PLANNER', 'SCHEDULE', agentActor(AGENTS.CONTENT_PLANNER));
    expect(orphan.status).toBe('PARTIAL');
    expect(stepsOf(await runOf(orphan.run_id))[1]).toEqual([
      'action-1',
      'FAILED',
      'social.create_post',
      'Content planner has nobody to file its work under — save it from Marketing › Automation › Agents first.',
    ]);
    expect(await SocialScheduledPostModel.countDocuments()).toBe(0);

    const manager = new Types.ObjectId().toHexString();
    await MarketingAgentConfigModel.create({ key: 'CONTENT_PLANNER', enabled: true, params: { brief: 'Pets', posts_per_week: 1 }, updated_by: manager });
    const owned = await runMarketingAgent('CONTENT_PLANNER', 'SCHEDULE', agentActor(AGENTS.CONTENT_PLANNER));
    expect(owned.status).toBe('COMPLETED');
    const saved = await SocialScheduledPostModel.findOne().lean();
    expect(String(saved?.created_by)).toBe(manager);
    // The stored params reach the plan: the brief, and the limit it was given.
    const prompt = m(openaiChat).mock.calls.at(-1)?.[0].messages[1].content as string;
    expect(prompt).toContain('BRIEF:\nPets');
    expect(prompt).toContain('Create at most 1 post(s)');
  });

  it('falls back to the default params when the stored ones no longer validate', async () => {
    await MarketingAgentConfigModel.collection.insertOne({ key: 'CONTENT_PLANNER', enabled: true, params: { posts_per_week: 99 }, updated_by: USER });
    plan('Nothing.', []);
    await runMarketingAgent('CONTENT_PLANNER', 'SCHEDULE', agentActor(AGENTS.CONTENT_PLANNER));
    const prompt = m(openaiChat).mock.calls.at(-1)?.[0].messages[1].content as string;
    expect(prompt).toContain('Create at most 3 post(s)');
  });
});

describe('a run that is stopped', () => {
  it('skips the actions still to come and ends CANCELLED, with the report written', async () => {
    m(openaiChat).mockImplementation(async () => {
      const running = await MarketingRunModel.findOne({ workflow: 'AGENT', status: 'RUNNING' }).lean();
      await cancelRun(String(running?._id));
      return { ok: true, content: JSON.stringify({ summary: 'Check.', actions: [{ tool: 'accounts.health_check', input: {}, why: 'Daily' }] }), model: 'claude-test', usage: USAGE };
    });
    const outcome = await runMarketingAgent('ACCOUNT_DOCTOR', 'USER', actor, { user_id: USER });
    expect(outcome.status).toBe('CANCELLED');
    const run = await runOf(outcome.run_id);
    expect(stepsOf(run)).toEqual([
      ['plan', 'OK', 'marketing.agent_plan', ''],
      ['action-1', 'SKIPPED', 'accounts.health_check', 'Stopped before this step ran'],
      ['report', 'OK', '', ''],
    ]);
    expect(run.steps[2].output_summary).toContain('1. accounts.health_check: skipped — the run was stopped');
    expect(runHealthChecks).not.toHaveBeenCalled();
  });
});
