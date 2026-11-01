/**
 * The one AI call an agent makes: the prompt pair from the library, the model
 * the prompt pins (else the Claude default), one JSON answer read back as a
 * plan of at most ten actions — and a refusal from the funnel, or an answer
 * that is not a plan, as a thrown reason the run log can show.
 */
jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));
jest.mock('@services/anthropic/anthropic.client', () => ({ claudeDefaultModel: jest.fn(async () => 'claude-opus-5-5') }));
jest.mock('@modules/ai/prompt/prompt.service', () => ({ resolvePrompt: jest.fn() }));
jest.mock('@utils/app-time', () => ({ appDateTime: jest.fn(() => '03 Nov 2026, 09:00 AM'), getAppTimeZone: jest.fn(() => 'Asia/Kolkata') }));
jest.mock('@modules/crm/marketing/social/social.service', () => ({ socialService: { accounts: jest.fn() } }));

import { openaiChat } from '@services/openai/openai.client';
import { claudeDefaultModel } from '@services/anthropic/anthropic.client';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { socialService } from '@modules/crm/marketing/social/social.service';
import { AGENTS, AGENT_PARAMS } from '../../agent.catalog';
import { MAX_ACTIONS, parsePlan, planAgent, promptKeyFor } from '../../agent.plan';

const m = (fn: unknown) => fn as jest.Mock;
const USAGE = { prompt_tokens: 900, completion_tokens: 120, total_tokens: 1020 };

const answer = (content: string, model = 'claude-opus-5-5') => m(openaiChat).mockResolvedValue({ ok: true, content, model, usage: USAGE });

beforeEach(() => {
  m(resolvePrompt).mockImplementation(async (key: string, variables?: Record<string, string>) => ({
    content: variables ? `USER ${key} ${JSON.stringify(variables)}` : `SYSTEM ${key}`,
    model: '',
  }));
  m(socialService.accounts).mockResolvedValue([
    { id: 'a1', platform: 'LINKEDIN', name: 'Duncit', handle: 'duncit', status: 'CONNECTED', followers: 2300, health_ok: true, health_message: '' },
    { id: 'a2', platform: 'INSTAGRAM', name: 'Pets', handle: '', status: 'EXPIRED', followers: 12, health_ok: false, health_message: '' },
    { id: 'a3', platform: 'TIKTOK', name: 'Odd', handle: '', status: 'CONNECTED', followers: 1, health_ok: null, health_message: '' },
  ]);
});

describe('parsePlan', () => {
  it('reads a plan, trimming and capping the actions at ten', () => {
    const actions = Array.from({ length: MAX_ACTIONS + 2 }, (_v, i) => ({ tool: ` t${i} `, input: { n: i }, why: ` because ${i} ` }));
    const plan = parsePlan(JSON.stringify({ summary: '  A week of posts.  ', actions }));
    expect(plan.summary).toBe('A week of posts.');
    expect(plan.actions).toHaveLength(MAX_ACTIONS);
    expect(plan.actions[0]).toEqual({ tool: 't0', input: { n: 0 }, why: 'because 0' });
  });

  it('fills what the answer left out', () => {
    expect(parsePlan('{}')).toEqual({ summary: '', actions: [] });
    expect(parsePlan('{"actions":[{"tool":"accounts.health_check"}]}')).toEqual({
      summary: '',
      actions: [{ tool: 'accounts.health_check', input: {}, why: '' }],
    });
    expect(parsePlan('{"actions":[{"tool":"x","input":null}]}').actions[0].input).toEqual({});
  });

  it('throws for an answer that is not JSON, and for one that is not a plan', () => {
    expect(() => parsePlan('Sure! Here is the plan:')).toThrow('The plan was not valid JSON');
    expect(() => parsePlan('{"summary":1}')).toThrow(/The plan did not match the contract: summary/);
    expect(() => parsePlan('{"actions":[{"why":"no tool"}]}')).toThrow(/actions\.0\.tool/);
  });
});

describe('planAgent', () => {
  it('asks Claude on the task key with both prompts, the accounts and the limits, and reads the plan back', async () => {
    answer('{"summary":"Check the accounts.","actions":[{"tool":"accounts.health_check","input":{},"why":"Daily check"}]}');
    const out = await planAgent(AGENTS.ACCOUNT_DOCTOR, AGENT_PARAMS.parse({}), 'u1');

    expect(out).toEqual({
      plan: { summary: 'Check the accounts.', actions: [{ tool: 'accounts.health_check', input: {}, why: 'Daily check' }] },
      model: 'claude-opus-5-5',
      usage: USAGE,
    });
    expect(promptKeyFor(AGENTS.ACCOUNT_DOCTOR)).toBe('agents.account_doctor');
    expect(resolvePrompt).toHaveBeenCalledWith('agents.account_doctor');
    const [, variables] = m(resolvePrompt).mock.calls.find(([key]) => key === 'agents.account_doctor.user') as [string, Record<string, string>];
    expect(variables.brief).toBe('Anything on-brand');
    expect(variables.today).toMatch(/^03 Nov 2026, 09:00 AM \(Asia\/Kolkata; now is \d{4}-\d{2}-\d{2}T[\d:.]+Z\)$/);
    expect(variables.accounts.split('\n')).toEqual([
      '- id: a1 | LINKEDIN | "Duncit" (@duncit) | CONNECTED | 2300 followers | takes a text-only post',
      '- id: a2 | INSTAGRAM | "Pets" | EXPIRED | 12 followers | needs media (DRAFT only); health: needs a look',
      '- id: a3 | TIKTOK | "Odd" | CONNECTED | 1 followers | takes a text-only post',
    ]);
    expect(variables.limits).toBe('At most 10 actions.');

    expect(claudeDefaultModel).toHaveBeenCalled();
    expect(openaiChat).toHaveBeenCalledWith({
      task: 'marketing.agent_plan',
      model: 'claude-opus-5-5',
      json: true,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: 'SYSTEM agents.account_doctor' },
        { role: 'user', content: expect.stringContaining('USER agents.account_doctor.user') },
      ],
      detail: 'ACCOUNT_DOCTOR',
      user_id: 'u1',
    });
  });

  it('tells the Content planner its brief, its networks, how many posts and the week they may land in', async () => {
    answer('{"summary":"ok","actions":[]}');
    const params = AGENT_PARAMS.parse({ brief: 'Monsoon pods', networks: ['LINKEDIN'], posts_per_week: 2 });
    await planAgent(AGENTS.CONTENT_PLANNER, params, '');

    const [, variables] = m(resolvePrompt).mock.calls.find(([key]) => key === 'agents.content_planner.user') as [string, Record<string, string>];
    expect(variables.brief).toBe('Monsoon pods');
    const limits = variables.limits.split('\n');
    expect(limits[0]).toBe('At most 10 actions.');
    expect(limits[1]).toBe('Create at most 2 post(s), spread across the coming week.');
    expect(limits[2]).toBe('Networks: LINKEDIN.');
    expect(limits[3]).toMatch(/^Schedule each post between \d{4}-\d{2}-\d{2}T.* and \d{4}-\d{2}-\d{2}T.* \(ISO 8601 with offset\), never in the past\.$/);
    expect(limits[4]).toBe('Everything you create waits for a person on Approvals; nothing goes out on its own.');
    // No signed-in person: the funnel row is written without one.
    expect(m(openaiChat).mock.calls[0][0].user_id).toBeUndefined();
  });

  it('says "every connected network" when the planner has none pinned, and "(no connected accounts)" when nothing is connected', async () => {
    answer('{"summary":"ok","actions":[]}');
    m(socialService.accounts).mockResolvedValue([]);
    await planAgent(AGENTS.CONTENT_PLANNER, AGENT_PARAMS.parse({}), 'u1');
    const [, variables] = m(resolvePrompt).mock.calls.find(([key]) => key === 'agents.content_planner.user') as [string, Record<string, string>];
    expect(variables.accounts).toBe('(no connected accounts)');
    expect(variables.limits).toContain('Networks: every connected network.');
  });

  it('runs on the model the prompt pins instead of the default', async () => {
    m(resolvePrompt).mockImplementation(async (key: string) => ({ content: key, model: key.endsWith('.user') ? '' : 'claude-sonnet-5-5' }));
    answer('{"actions":[]}', 'claude-sonnet-5-5');
    const out = await planAgent(AGENTS.COMMUNITY_WATCH, AGENT_PARAMS.parse({}), 'u1');
    expect(claudeDefaultModel).not.toHaveBeenCalled();
    expect(m(openaiChat).mock.calls[0][0].model).toBe('claude-sonnet-5-5');
    expect(out.model).toBe('claude-sonnet-5-5');
  });

  it('throws the funnel’s own message when it refuses', async () => {
    m(openaiChat).mockResolvedValue({ ok: false, code: 'DISABLED', status: 0, message: 'This AI feature is switched off in the AI portal (AI Features).', model: 'claude-opus-5-5' });
    await expect(planAgent(AGENTS.COMMUNITY_WATCH, AGENT_PARAMS.parse({}), 'u1')).rejects.toThrow('switched off in the AI portal');
  });

  it('throws when the answer is not a plan', async () => {
    answer('I would rather not.');
    await expect(planAgent(AGENTS.COMMUNITY_WATCH, AGENT_PARAMS.parse({}), 'u1')).rejects.toThrow('The plan was not valid JSON');
  });
});
