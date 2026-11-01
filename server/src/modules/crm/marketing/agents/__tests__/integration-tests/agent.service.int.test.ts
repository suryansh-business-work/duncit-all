/**
 * The agents' settings against a real database: the catalogue merged with
 * what was saved, a save that is validated and books the next run, Run now
 * in the person's name, and the two calls the orchestrator makes. The runner
 * is faked — what a run does is the runner's own suite.
 */
jest.mock('@modules/crm/marketing/agents/agent.runner', () => ({
  startMarketingAgent: jest.fn(),
}));
jest.mock('@utils/app-time', () => ({ ...jest.requireActual('@utils/app-time'), getAppTimeZone: jest.fn(() => 'Asia/Kolkata') }));

import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { MarketingRunModel } from '../../../runs/marketingRun.model';
import { MarketingAgentConfigModel } from '../../agent.model';
import { startMarketingAgent } from '../../agent.runner';
import { marketingAgentService as svc } from '../../agent.service';

const m = (fn: unknown) => fn as jest.Mock;
const MANAGER = new Types.ObjectId().toHexString();
const HOUR = 3_600_000;
const WEEK = 7 * 24 * HOUR;

const defaults = {
  enabled: false,
  params: { brief: '', networks: [], posts_per_week: 3 },
  last_run_at: null,
  last_run_id: '',
  last_run_status: null,
  next_run_at: null,
  updated_at: null,
};

describe('list', () => {
  it('answers the three agents from the catalogue, switched off, when nothing was ever saved', async () => {
    const agents = await svc.list();
    expect(agents.map((a) => a.key)).toEqual(['CONTENT_PLANNER', 'COMMUNITY_WATCH', 'ACCOUNT_DOCTOR']);
    expect(agents[0]).toMatchObject({
      ...defaults,
      name: 'Content planner',
      schedule: { every: 'WEEK', hour: 9, weekday: 1 },
      has_params: true,
      needs_approval: true,
      tools: ['social.list_accounts', 'social.generate_ideas', 'social.create_post'],
    });
    expect(agents[2]).toMatchObject({ ...defaults, name: 'Account doctor', schedule: { every: 'DAY', hour: 7, weekday: 0 }, has_params: false });
  });

  it('reads the saved switch, schedule, params and the last run’s status', async () => {
    const run = await MarketingRunModel.create({ workflow: 'AGENT', name: 'Account doctor', status: 'PARTIAL' });
    await MarketingAgentConfigModel.create({
      key: 'ACCOUNT_DOCTOR',
      enabled: true,
      schedule: { every: 'DAY', hour: 6 },
      last_run_at: new Date('2026-11-02T00:30:00.000Z'),
      last_run_id: String(run._id),
      next_run_at: new Date('2026-11-03T00:30:00.000Z'),
      updated_by: MANAGER,
    });
    const doctor = (await svc.list()).find((a) => a.key === 'ACCOUNT_DOCTOR');
    expect(doctor).toMatchObject({
      enabled: true,
      schedule: { every: 'DAY', hour: 6, weekday: 0 },
      last_run_at: '2026-11-02T00:30:00.000Z',
      last_run_id: String(run._id),
      last_run_status: 'PARTIAL',
      next_run_at: '2026-11-03T00:30:00.000Z',
    });
    expect(doctor?.updated_at).not.toBeNull();
  });

  it('shows no status for a last run that no longer exists, and defaults for params that no longer validate', async () => {
    await MarketingAgentConfigModel.collection.insertOne({ key: 'CONTENT_PLANNER', enabled: false, params: { posts_per_week: 0 }, last_run_id: new Types.ObjectId().toHexString() });
    const planner = (await svc.list()).find((a) => a.key === 'CONTENT_PLANNER');
    expect(planner).toMatchObject({ last_run_status: null, params: { brief: '', networks: [], posts_per_week: 3 } });
  });
});

describe('update', () => {
  it('saves the switch, the schedule and the params, and books the next run on the admin clock', async () => {
    const before = Date.now();
    const out = await svc.update(
      'CONTENT_PLANNER',
      { enabled: true, schedule: { every: 'WEEK', hour: 9, weekday: 1 }, params: { brief: '  Monsoon pods ', networks: ['LINKEDIN', 'X'], posts_per_week: 2 } },
      MANAGER
    );
    expect(out).toMatchObject({
      key: 'CONTENT_PLANNER',
      enabled: true,
      schedule: { every: 'WEEK', hour: 9, weekday: 1 },
      params: { brief: 'Monsoon pods', networks: ['LINKEDIN', 'X'], posts_per_week: 2 },
      last_run_status: null,
    });
    const next = new Date(out.next_run_at as string).getTime();
    expect(next).toBeGreaterThan(before);
    expect(next - before).toBeLessThanOrEqual(WEEK);
    // 09:00 IST is 03:30Z.
    expect(out.next_run_at).toMatch(/T03:30:00\.000Z$/);
    expect(new Date(out.next_run_at as string).getUTCDay()).toBe(1);

    const saved = await MarketingAgentConfigModel.findOne({ key: 'CONTENT_PLANNER' }).lean();
    expect(saved).toMatchObject({ enabled: true, updated_by: MANAGER, params: { brief: 'Monsoon pods', networks: ['LINKEDIN', 'X'], posts_per_week: 2 } });
  });

  it('keeps what a partial save leaves out, and clears the next run when switched off', async () => {
    await svc.update('ACCOUNT_DOCTOR', { enabled: true, schedule: { every: 'DAY', hour: 5 } }, MANAGER);
    const off = await svc.update('ACCOUNT_DOCTOR', { enabled: false }, MANAGER);
    expect(off).toMatchObject({ enabled: false, schedule: { every: 'DAY', hour: 5, weekday: 0 }, next_run_at: null });

    const on = await svc.update('ACCOUNT_DOCTOR', { enabled: true }, MANAGER);
    expect(on.schedule).toEqual({ every: 'DAY', hour: 5, weekday: 0 });
    expect(on.next_run_at).toMatch(/T23:30:00\.000Z$/);
  });

  it('reads a missing weekday as Sunday and a saved params change on an agent that reads none', async () => {
    const out = await svc.update('COMMUNITY_WATCH', { schedule: { every: 'WEEK', hour: 8 }, params: { brief: 'ignored' } }, MANAGER);
    expect(out.schedule).toEqual({ every: 'WEEK', hour: 8, weekday: 0 });
    expect(out.params.brief).toBe('ignored');
    expect(out.enabled).toBe(false);
  });

  it.each([
    ['an hour past the clock', { schedule: { every: 'DAY' as const, hour: 24 } }, 'The schedule is not valid: hour'],
    ['a weekday past the week', { schedule: { every: 'WEEK' as const, hour: 9, weekday: 7 } }, 'The schedule is not valid: weekday'],
    ['zero posts a week', { params: { posts_per_week: 0 } }, 'The settings are not valid: posts_per_week'],
    ['a network it does not know', { params: { networks: ['TIKTOK'] } }, 'The settings are not valid: networks'],
    ['a brief that runs on', { params: { brief: 'x'.repeat(501) } }, 'The settings are not valid: brief'],
  ])('refuses %s without saving', async (_label, input, message) => {
    await expect(svc.update('CONTENT_PLANNER', input, MANAGER)).rejects.toMatchObject({
      message: expect.stringContaining(message),
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(await MarketingAgentConfigModel.countDocuments()).toBe(0);
  });

  it('refuses an agent the catalogue does not know', async () => {
    await expect(svc.update('LEAD_HUNTER', { enabled: true }, MANAGER)).rejects.toMatchObject({
      message: 'Unknown marketing agent "LEAD_HUNTER"',
      extensions: { code: 'NOT_FOUND' },
    });
  });
});

describe('runNow', () => {
  it('starts the agent as the signed-in person, remembers the run, and answers its id at once', async () => {
    await UserModel.create({ _id: MANAGER, auth: { email: 'meera@duncit.test' }, profile: { first_name: 'Meera', last_name: 'M' } });
    m(startMarketingAgent).mockResolvedValue({ run_id: 'run-9', finished: new Promise(() => undefined) });

    const id = await svc.runNow('ACCOUNT_DOCTOR', { id: MANAGER });

    expect(id).toBe('run-9');
    expect(startMarketingAgent).toHaveBeenCalledWith('ACCOUNT_DOCTOR', 'USER', { kind: 'USER', id: MANAGER, name: 'Meera M', email: 'meera@duncit.test' }, { user_id: MANAGER });
    const saved = await MarketingAgentConfigModel.findOne({ key: 'ACCOUNT_DOCTOR' }).lean();
    expect(saved).toMatchObject({ enabled: false, last_run_id: 'run-9', next_run_at: null, params: {} });
    expect(saved?.last_run_at).toBeInstanceOf(Date);
  });

  it('refuses an agent the catalogue does not know before starting anything', async () => {
    await expect(svc.runNow('LEAD_HUNTER', { id: MANAGER })).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    expect(startMarketingAgent).not.toHaveBeenCalled();
  });
});

describe('dueAgents and markRan', () => {
  it('names only the enabled agents whose time has come', async () => {
    const now = new Date('2026-11-03T03:30:00.000Z');
    await MarketingAgentConfigModel.create([
      { key: 'ACCOUNT_DOCTOR', enabled: true, next_run_at: new Date('2026-11-03T03:29:00.000Z') },
      { key: 'COMMUNITY_WATCH', enabled: true, next_run_at: new Date('2026-11-03T03:31:00.000Z') },
      { key: 'CONTENT_PLANNER', enabled: false, next_run_at: new Date('2026-11-01T03:30:00.000Z') },
    ]);
    expect(await svc.dueAgents(now)).toEqual(['ACCOUNT_DOCTOR']);
    expect(await svc.dueAgents(new Date('2026-11-03T03:31:00.000Z'))).toEqual(['ACCOUNT_DOCTOR', 'COMMUNITY_WATCH']);
  });

  it('ignores an enabled agent that was never booked', async () => {
    await MarketingAgentConfigModel.create({ key: 'ACCOUNT_DOCTOR', enabled: true, next_run_at: null });
    expect(await svc.dueAgents(new Date())).toEqual([]);
  });

  it('moves an enabled agent on to its next slot and remembers the run', async () => {
    const now = new Date('2026-11-03T03:30:00.000Z');
    await MarketingAgentConfigModel.create({ key: 'ACCOUNT_DOCTOR', enabled: true, schedule: { every: 'DAY', hour: 9 }, next_run_at: now });
    await svc.markRan('ACCOUNT_DOCTOR', 'run-1', now);
    expect(await MarketingAgentConfigModel.findOne({ key: 'ACCOUNT_DOCTOR' }).lean()).toMatchObject({
      enabled: true,
      last_run_at: now,
      last_run_id: 'run-1',
      // 09:00 IST the next day.
      next_run_at: new Date('2026-11-04T03:30:00.000Z'),
    });
  });

  it('creates a switched-off row for an agent run before it was ever saved', async () => {
    const now = new Date('2026-11-03T03:30:00.000Z');
    await svc.markRan('COMMUNITY_WATCH', 'run-2', now);
    expect(await MarketingAgentConfigModel.findOne({ key: 'COMMUNITY_WATCH' }).lean()).toMatchObject({
      enabled: false,
      schedule: { every: 'DAY', hour: 8, weekday: 0 },
      params: {},
      last_run_id: 'run-2',
      next_run_at: null,
    });
  });
});
