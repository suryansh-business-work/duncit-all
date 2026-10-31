/**
 * The publishing resolvers' gate: a Marketing Editor writes, schedules and
 * retries posts, but every send is parked for a manager — and Share now,
 * which skips the queue, is not theirs. The service is faked; only the gate
 * and what it hands the service are under test.
 */
jest.mock('@modules/crm/marketing/social/social.publish.service', () => ({
  socialPublishService: {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    shareNow: jest.fn(),
    retry: jest.fn(),
    list: jest.fn(),
    get: jest.fn(),
    calendar: jest.fn(),
  },
}));
jest.mock('@modules/crm/marketing/social/social.ideas', () => ({
  socialIdeasService: { list: jest.fn(), generate: jest.fn(), setStatus: jest.fn(), remove: jest.fn() },
}));

import { makeContext } from '@test/harness';
import { socialPublishService } from '../../social.publish.service';
import { socialPublishResolvers } from '../../social.publish.resolver';

const svc = socialPublishService as unknown as Record<string, jest.Mock>;
const M = socialPublishResolvers.Mutation;
const Q = socialPublishResolvers.Query;
const editor = () => makeContext({ roles: ['MARKETING_EDITOR'] });
const manager = () => makeContext({ roles: ['MARKETING_MANAGER'] });
const input = { text: 'Pets of Pune', account_ids: ['a1'], mode: 'SCHEDULE' as const, scheduled_at: '2026-11-02T09:00:00.000Z' };

beforeEach(() => {
  for (const fn of Object.values(svc)) fn.mockReset().mockResolvedValue({ id: 'p1' });
});

describe('the publishing gate', () => {
  it("parks an editor's post for approval whether or not they asked, and leaves a manager's choice alone", async () => {
    const ctx = editor();
    await M.createScheduledSocialPost({}, { input }, ctx);
    expect(svc.create).toHaveBeenCalledWith({ ...input, needs_approval: true }, ctx.user?.id);
    await M.updateScheduledSocialPost({}, { id: 'p1', input: { ...input, needs_approval: false } }, ctx);
    expect(svc.update).toHaveBeenCalledWith('p1', { ...input, needs_approval: true }, ctx.user?.id);

    const boss = manager();
    await M.createScheduledSocialPost({}, { input }, boss);
    expect(svc.create).toHaveBeenLastCalledWith(input, boss.user?.id);
    await M.createScheduledSocialPost({}, { input: { ...input, needs_approval: true } }, boss);
    expect(svc.create).toHaveBeenLastCalledWith({ ...input, needs_approval: true }, boss.user?.id);
  });

  it('lets an editor read the queue and the calendar, delete and retry, but not share now', async () => {
    const ctx = editor();
    await Q.socialScheduledPosts({}, { view: 'QUEUE' }, ctx);
    await Q.socialCalendar({}, { from: '2026-11-01', to: '2026-11-08' }, ctx);
    await M.deleteScheduledSocialPost({}, { id: 'p1' }, ctx);
    await M.retryScheduledSocialPost({}, { id: 'p1' }, ctx);
    expect(svc.list).toHaveBeenCalledWith('QUEUE');
    expect(svc.calendar).toHaveBeenCalledWith('2026-11-01', '2026-11-08');
    expect(svc.remove).toHaveBeenCalledWith('p1');
    expect(svc.retry).toHaveBeenCalledWith('p1', ctx.user?.id);

    expect(() => M.shareScheduledSocialPostNow({}, { id: 'p1' }, ctx)).toThrow(/access denied/i);
    expect(svc.shareNow).not.toHaveBeenCalled();
    await M.shareScheduledSocialPostNow({}, { id: 'p1' }, manager());
    expect(svc.shareNow).toHaveBeenCalledTimes(1);
  });

  it('keeps everyone else out', () => {
    const ctx = makeContext({ roles: ['USER'] });
    expect(() => Q.socialScheduledPosts({}, { view: 'QUEUE' }, ctx)).toThrow(/access denied/i);
    expect(() => M.createScheduledSocialPost({}, { input }, ctx)).toThrow(/access denied/i);
  });
});
