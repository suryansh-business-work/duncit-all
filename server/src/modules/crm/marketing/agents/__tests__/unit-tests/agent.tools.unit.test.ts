/**
 * The tool registry: a plan's call is validated and gated before anything
 * runs, and each tool is a thin door onto a service the console already has.
 * Every service is faked; what is under test is the gate, the inputs handed
 * on, and the one-line summaries the run log shows.
 */
jest.mock('@modules/crm/marketing/social/social.service', () => ({ socialService: { accounts: jest.fn() } }));
jest.mock('@modules/crm/marketing/social/social.ideas', () => ({ socialIdeasService: { generate: jest.fn() } }));
jest.mock('@modules/crm/marketing/social/social.publish.service', () => ({ socialPublishService: { create: jest.fn() } }));
jest.mock('@modules/crm/marketing/social/social.ai', () => ({ analyzePendingComments: jest.fn() }));
jest.mock('@modules/crm/marketing/social/social.health', () => ({ runHealthChecks: jest.fn() }));

import { Types } from 'mongoose';
import { socialService } from '@modules/crm/marketing/social/social.service';
import { socialIdeasService } from '@modules/crm/marketing/social/social.ideas';
import { socialPublishService } from '@modules/crm/marketing/social/social.publish.service';
import { analyzePendingComments } from '@modules/crm/marketing/social/social.ai';
import { runHealthChecks } from '@modules/crm/marketing/social/social.health';
import { AGENTS } from '../../agent.catalog';
import { TOOLS, ToolRefusedError, isToolKey, runTool, type ToolContext } from '../../agent.tools';

const m = (fn: unknown) => fn as jest.Mock;
const ACCOUNT = new Types.ObjectId().toHexString();
const OTHER = new Types.ObjectId().toHexString();
const USER = new Types.ObjectId().toHexString();
const HOUR = 3_600_000;

const ctxFor = (agent: keyof typeof AGENTS, user_id = USER): ToolContext => ({
  run: {
    id: 'run-1',
    step: jest.fn(),
    api: jest.fn(),
    cost: jest.fn(),
    cancelled: jest.fn(async () => false),
  },
  actor: { kind: 'USER', id: user_id },
  user_id,
  agent: AGENTS[agent],
});

const future = () => new Date(Date.now() + HOUR).toISOString();

beforeEach(() => {
  m(socialService.accounts).mockResolvedValue([
    { id: ACCOUNT, platform: 'LINKEDIN', name: 'Duncit', handle: 'duncit', status: 'CONNECTED', followers: 2300, health_ok: true, health_message: '' },
    { id: OTHER, platform: 'INSTAGRAM', name: 'Duncit Pets', handle: '', status: 'EXPIRED', followers: 12, health_ok: false, health_message: 'token lapsed' },
  ]);
});

describe('the gate', () => {
  it('knows exactly the five tools', () => {
    expect(Object.keys(TOOLS).sort()).toEqual(
      ['accounts.health_check', 'comments.analyze', 'social.create_post', 'social.generate_ideas', 'social.list_accounts'].sort()
    );
    expect(isToolKey('social.create_post')).toBe(true);
    expect(isToolKey('social.delete_post')).toBe(false);
  });

  it('refuses a tool it does not know, naming it', async () => {
    await expect(runTool('social.delete_post', {}, ctxFor('CONTENT_PLANNER'))).rejects.toThrow(new ToolRefusedError('Unknown tool "social.delete_post"'));
  });

  it('refuses a known tool the agent is not allowed, without running it', async () => {
    await expect(runTool('social.create_post', { text: 'hi' }, ctxFor('ACCOUNT_DOCTOR'))).rejects.toThrow('Account doctor may not use social.create_post');
    await expect(runTool('comments.analyze', {}, ctxFor('CONTENT_PLANNER'))).rejects.toThrow('Content planner may not use comments.analyze');
    expect(socialPublishService.create).not.toHaveBeenCalled();
    expect(analyzePendingComments).not.toHaveBeenCalled();
  });

  it('refuses an input the schema rejects, saying which field, without running it', async () => {
    await expect(runTool('social.create_post', { text: '', account_ids: [], scheduled_at: 'soon' }, ctxFor('CONTENT_PLANNER'))).rejects.toThrow(
      /Bad input for social\.create_post: text .*; account_ids .*; scheduled_at must be an ISO 8601 date-time in the future/
    );
    await expect(runTool('comments.analyze', { account_id: 'nope' }, ctxFor('COMMUNITY_WATCH'))).rejects.toThrow('account_id must be an account id');
    expect(socialPublishService.create).not.toHaveBeenCalled();
    expect(analyzePendingComments).not.toHaveBeenCalled();
  });

  it('treats a missing input as an empty one', async () => {
    m(runHealthChecks).mockResolvedValue([]);
    await expect(runTool('accounts.health_check', null, ctxFor('ACCOUNT_DOCTOR'))).resolves.toMatchObject({ summary: '0 account(s) checked; 0 need a person' });
  });
});

describe('social.list_accounts', () => {
  it('lists the accounts with the fields a planner needs and names the first few', async () => {
    const out = await runTool('social.list_accounts', {}, ctxFor('COMMUNITY_WATCH'));
    expect(out.summary).toBe('2 account(s): LINKEDIN Duncit (CONNECTED), INSTAGRAM Duncit Pets (EXPIRED)');
    expect(out.data).toEqual([
      { id: ACCOUNT, platform: 'LINKEDIN', name: 'Duncit', handle: 'duncit', status: 'CONNECTED', followers: 2300, health_ok: true, health_message: '' },
      { id: OTHER, platform: 'INSTAGRAM', name: 'Duncit Pets', handle: '', status: 'EXPIRED', followers: 12, health_ok: false, health_message: 'token lapsed' },
    ]);
  });

  it('says so when nothing is connected', async () => {
    m(socialService.accounts).mockResolvedValue([]);
    await expect(runTool('social.list_accounts', {}, ctxFor('ACCOUNT_DOCTOR'))).resolves.toEqual({ summary: 'No connected accounts', data: [] });
  });
});

describe('social.generate_ideas', () => {
  it('writes ideas onto the board as the person and lists their titles', async () => {
    m(socialIdeasService.generate).mockResolvedValue([
      { id: 'i1', title: 'Pup walk', caption: 'c1', hashtags: ['dogs'], platforms: ['LINKEDIN'], format: 'TEXT', why: '' },
      { id: 'i2', title: 'Monsoon board games', caption: 'c2', hashtags: [], platforms: ['X'], format: 'IMAGE', why: '' },
    ]);
    const out = await runTool('social.generate_ideas', { brief: ' Monsoon ', platforms: ['LINKEDIN', 'X'], count: 2 }, ctxFor('CONTENT_PLANNER'));
    expect(socialIdeasService.generate).toHaveBeenCalledWith({ brief: 'Monsoon', platforms: ['LINKEDIN', 'X'], count: 2 }, USER);
    expect(out.summary).toBe('2 idea(s) on the board: Pup walk | Monsoon board games');
    expect(out.data).toEqual([
      { id: 'i1', title: 'Pup walk', caption: 'c1', platforms: ['LINKEDIN'], format: 'TEXT' },
      { id: 'i2', title: 'Monsoon board games', caption: 'c2', platforms: ['X'], format: 'IMAGE' },
    ]);
  });

  it('fills the defaults when the plan gives only a brief', async () => {
    m(socialIdeasService.generate).mockResolvedValue([]);
    await runTool('social.generate_ideas', { brief: 'Pets' }, ctxFor('CONTENT_PLANNER'));
    expect(socialIdeasService.generate).toHaveBeenCalledWith({ brief: 'Pets', platforms: [], count: 5 }, USER);
  });

  it('refuses more than ten ideas or a network it does not know', async () => {
    await expect(runTool('social.generate_ideas', { count: 11 }, ctxFor('CONTENT_PLANNER'))).rejects.toThrow('count');
    await expect(runTool('social.generate_ideas', { platforms: ['TIKTOK'] }, ctxFor('CONTENT_PLANNER'))).rejects.toThrow('platforms');
    expect(socialIdeasService.generate).not.toHaveBeenCalled();
  });

  it('refuses to write for an agent that has nobody to file its work under', async () => {
    await expect(runTool('social.generate_ideas', { brief: 'Pets' }, ctxFor('CONTENT_PLANNER', ''))).rejects.toThrow(
      'Content planner has nobody to file its work under — save it from Marketing › Automation › Agents first.'
    );
    expect(socialIdeasService.generate).not.toHaveBeenCalled();
  });
});

describe('social.create_post', () => {
  it('creates the post as the person, media-less, always waiting for approval, and says it waits', async () => {
    const at = future();
    m(socialPublishService.create).mockResolvedValue({ id: 'p1', status: 'PENDING_APPROVAL', scheduled_at: at, targets: [{ account_id: ACCOUNT }] });
    const out = await runTool('social.create_post', { text: '  Pets of Pune  ', account_ids: [ACCOUNT], scheduled_at: at }, ctxFor('CONTENT_PLANNER'));
    expect(socialPublishService.create).toHaveBeenCalledWith(
      { text: 'Pets of Pune', media: [], account_ids: [ACCOUNT], mode: 'SCHEDULE', scheduled_at: at, idea_id: null, needs_approval: true },
      USER
    );
    expect(out.summary).toBe(`Post p1 for 1 account(s) at ${at} — waits on Approvals`);
    expect(out.data).toEqual({ id: 'p1', status: 'PENDING_APPROVAL', scheduled_at: at });
  });

  it('keeps the idea it came from and saves a draft where the network needs media', async () => {
    const at = future();
    m(socialPublishService.create).mockResolvedValue({ id: 'p2', status: 'DRAFT', scheduled_at: at, targets: [{ account_id: OTHER }] });
    const out = await runTool('social.create_post', { text: 'Reel soon', account_ids: [OTHER], scheduled_at: at, idea_id: 'i1', mode: 'DRAFT' }, ctxFor('CONTENT_PLANNER'));
    expect(socialPublishService.create).toHaveBeenCalledWith(expect.objectContaining({ mode: 'DRAFT', idea_id: 'i1', needs_approval: true }), USER);
    expect(out.summary).toBe(`Post p2 for 1 account(s) at ${at} — saved as a draft (needs media before it can go out)`);
  });

  it('refuses a time in the past, an unreadable time and an id that is not an account', async () => {
    const past = new Date(Date.now() - HOUR).toISOString();
    await expect(runTool('social.create_post', { text: 'x', account_ids: [ACCOUNT], scheduled_at: past }, ctxFor('CONTENT_PLANNER'))).rejects.toThrow('scheduled_at');
    await expect(runTool('social.create_post', { text: 'x', account_ids: [ACCOUNT], scheduled_at: 'tomorrow' }, ctxFor('CONTENT_PLANNER'))).rejects.toThrow('scheduled_at');
    await expect(runTool('social.create_post', { text: 'x', account_ids: ['acc-1'], scheduled_at: future() }, ctxFor('CONTENT_PLANNER'))).rejects.toThrow('account_ids.0 must be an account id');
    expect(socialPublishService.create).not.toHaveBeenCalled();
  });

  it('lets the service’s own refusal through', async () => {
    m(socialPublishService.create).mockRejectedValue(new Error('Reconnect Duncit Pets before posting to it.'));
    await expect(runTool('social.create_post', { text: 'x', account_ids: [OTHER], scheduled_at: future() }, ctxFor('CONTENT_PLANNER'))).rejects.toThrow('Reconnect Duncit Pets');
  });
});

describe('comments.analyze', () => {
  it('reviews everything, or one account, and says that nobody was answered', async () => {
    m(analyzePendingComments).mockResolvedValue({ analyzed: 12, flagged: 2, error: null });
    const out = await runTool('comments.analyze', {}, ctxFor('COMMUNITY_WATCH'));
    expect(analyzePendingComments).toHaveBeenCalledWith(undefined);
    expect(out.summary).toBe(
      '12 comment(s) reviewed, 2 flagged. No reply was sent: the Meta reply permission is not held, so flagged comments wait for a person on Social Accounts › Monitoring.'
    );
    expect(out.data).toEqual({ analyzed: 12, flagged: 2, error: null });

    await runTool('comments.analyze', { account_id: ACCOUNT }, ctxFor('COMMUNITY_WATCH'));
    expect(analyzePendingComments).toHaveBeenLastCalledWith(ACCOUNT);
  });

  it('fails the step when the review stopped early', async () => {
    m(analyzePendingComments).mockResolvedValue({ analyzed: 3, flagged: 0, error: 'OpenAI is not configured' });
    await expect(runTool('comments.analyze', {}, ctxFor('COMMUNITY_WATCH'))).rejects.toThrow('OpenAI is not configured');
  });
});

describe('accounts.health_check', () => {
  it('names the accounts that need a person', async () => {
    const checked_at = new Date();
    m(runHealthChecks).mockResolvedValue([
      { account_id: ACCOUNT, platform: 'LINKEDIN', name: 'Duncit', status: 'CONNECTED', ok: true, expired: false, message: '', expires_in_days: 40, checked_at },
      { account_id: OTHER, platform: 'INSTAGRAM', name: 'Duncit Pets', status: 'EXPIRED', ok: false, expired: true, message: 'token lapsed', expires_in_days: -2, checked_at },
    ]);
    const out = await runTool('accounts.health_check', {}, ctxFor('ACCOUNT_DOCTOR'));
    expect(out.summary).toBe('2 account(s) checked; 1 need a person: Duncit Pets (token lapsed)');
    expect(out.data).toEqual([
      { account_id: ACCOUNT, platform: 'LINKEDIN', name: 'Duncit', ok: true, expired: false, message: '', expires_in_days: 40 },
      { account_id: OTHER, platform: 'INSTAGRAM', name: 'Duncit Pets', ok: false, expired: true, message: 'token lapsed', expires_in_days: -2 },
    ]);
  });
});
