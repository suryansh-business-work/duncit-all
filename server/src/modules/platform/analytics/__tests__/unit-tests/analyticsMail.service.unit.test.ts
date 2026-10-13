/**
 * Subscribers of the analytics mail: input validation, the one-row-per-address
 * rule, and the scheduler's claim-before-send so a trip is never mailed twice.
 */
jest.mock('@utils/cron-schedule', () => ({
  isDue: jest.fn(),
  nextRunAt: jest.fn(),
  parseTimeOfDay: jest.fn(),
}));
jest.mock('@utils/app-time', () => ({ getAppTimeZone: () => 'Asia/Kolkata' }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn() } } }));
jest.mock('../../mail/analyticsMail.model', () => ({
  ANALYTICS_MAIL_FREQUENCIES: ['DAILY', 'WEEKLY'],
  ANALYTICS_MAIL_SETTINGS_KEY: 'default',
  AnalyticsMailSettingsModel: { findOneAndUpdate: jest.fn(), updateOne: jest.fn() },
  AnalyticsMailSubscriptionModel: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
    updateOne: jest.fn(),
  },
}));
jest.mock('../../mail/analyticsMail.send', () => ({ sendAnalyticsReport: jest.fn(), sendContext: jest.fn() }));
jest.mock('../../mail/analyticsMail.notice', () => ({ sendSubscribedNotice: jest.fn() }));

import { Types } from 'mongoose';
import { isDue, nextRunAt, parseTimeOfDay } from '@utils/cron-schedule';
import { logs } from '@observability/log';
import {
  AnalyticsMailSettingsModel,
  AnalyticsMailSubscriptionModel,
} from '../../mail/analyticsMail.model';
import { sendAnalyticsReport, sendContext } from '../../mail/analyticsMail.send';
import { sendSubscribedNotice } from '../../mail/analyticsMail.notice';
import {
  analyticsMailService,
  type AnalyticsMailSubscriptionInput,
} from '../../mail/analyticsMail.service';

const m = (fn: unknown) => fn as jest.Mock;
const ID = new Types.ObjectId().toHexString();
const NOW = new Date('2026-03-15T06:00:00Z');
const SubModel = AnalyticsMailSubscriptionModel;

const settings = { enabled: true, time_of_day: '09:00', weekday: 1 };
const sub = (over: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(ID),
  name: 'Ops',
  email: 'ops@example.com',
  pages: ['PODS'],
  frequency: 'DAILY',
  days: 30,
  ai_summary: false,
  is_active: true,
  last_sent_at: null,
  last_status: null,
  last_error: '',
  created_at: new Date('2026-03-01T00:00:00Z'),
  ...over,
});
const input = (over: Partial<AnalyticsMailSubscriptionInput> = {}): AnalyticsMailSubscriptionInput => ({
  name: ' Ops ',
  email: ' Ops@Example.com ',
  pages: ['REVENUE', 'PODS'],
  frequency: 'DAILY',
  days: 30,
  ai_summary: true,
  is_active: true,
  ...over,
});
const orFail = <T>(value: T) => ({ orFail: () => Promise.resolve(value) });
const noClash = () => m(SubModel.findOne).mockReturnValue({ select: () => ({ lean: () => Promise.resolve(null) }) });

beforeEach(() => {
  jest.clearAllMocks();
  m(AnalyticsMailSettingsModel.findOneAndUpdate).mockReturnValue(orFail(settings));
  m(nextRunAt).mockReturnValue(new Date('2026-03-16T03:30:00Z'));
  m(parseTimeOfDay).mockReturnValue({ hour: 9, minute: 0 });
  m(sendContext).mockReturnValue({ ctx: true });
  m(sendSubscribedNotice).mockResolvedValue(undefined);
});

describe('settings', () => {
  it('reads the settings with the app time zone', async () => {
    expect(await analyticsMailService.settings()).toEqual({
      enabled: true,
      time_of_day: '09:00',
      weekday: 1,
      time_zone: 'Asia/Kolkata',
    });
  });

  it('saves a valid schedule and returns the stored settings', async () => {
    m(AnalyticsMailSettingsModel.updateOne).mockReturnValue({ exec: () => Promise.resolve({}) });
    await analyticsMailService.updateSettings({ enabled: 1 as never, time_of_day: ' 08:30 ', weekday: 3 });
    expect(m(AnalyticsMailSettingsModel.updateOne).mock.calls[0][1]).toEqual({
      $set: { enabled: true, time_of_day: '08:30', weekday: 3 },
    });
  });

  it('refuses an unparsable time and an out-of-range or fractional weekday', async () => {
    m(parseTimeOfDay).mockReturnValueOnce(null);
    await expect(
      analyticsMailService.updateSettings({ enabled: true, time_of_day: '25:99', weekday: 1 })
    ).rejects.toThrow(/HH:mm/);
    for (const weekday of [-1, 7, 1.5]) {
      await expect(
        analyticsMailService.updateSettings({ enabled: true, time_of_day: '09:00', weekday })
      ).rejects.toThrow(/weekday/i);
    }
    expect(AnalyticsMailSettingsModel.updateOne).not.toHaveBeenCalled();
  });
});

describe('list', () => {
  it('presents each subscriber with the next send, or none when the schedule owes none', async () => {
    const sent = new Date('2026-03-14T03:30:00Z');
    m(SubModel.find).mockReturnValue({
      sort: () => Promise.resolve([sub({ last_sent_at: sent, last_error: 'boom' }), sub()]),
    });
    m(nextRunAt).mockReturnValueOnce(new Date('2026-03-16T03:30:00Z')).mockReturnValueOnce(null);
    const out = await analyticsMailService.list();
    expect(out[0]).toMatchObject({
      id: ID,
      last_sent_at: sent.toISOString(),
      last_error: 'boom',
      next_send_at: '2026-03-16T03:30:00.000Z',
    });
    expect(out[1]).toMatchObject({ last_sent_at: null, last_error: null, next_send_at: null });
  });

  it('asks the schedule with the global switch AND the subscriber switch', async () => {
    m(SubModel.find).mockReturnValue({ sort: () => Promise.resolve([sub({ is_active: false })]) });
    await analyticsMailService.list();
    expect(m(nextRunAt).mock.calls[0][0]).toMatchObject({ enabled: false, frequency: 'DAILY', time_of_day: '09:00' });
  });
});

describe('create', () => {
  it('stores a clean row with pages in sidebar order and sends the subscribed notice', async () => {
    noClash();
    const created = sub({ pages: ['PODS', 'REVENUE'] });
    m(SubModel.create).mockResolvedValue(created);
    const out = await analyticsMailService.create(input(), 'admin-1');
    expect(m(SubModel.create).mock.calls[0][0]).toMatchObject({
      name: 'Ops',
      email: 'ops@example.com',
      pages: ['PODS', 'REVENUE'],
      created_by: 'admin-1',
    });
    expect(sendSubscribedNotice).toHaveBeenCalledWith(created, settings);
    expect(out.email).toBe('ops@example.com');
  });

  it('still creates the subscriber when the notice fails, and logs it', async () => {
    noClash();
    m(SubModel.create).mockResolvedValue(sub());
    m(sendSubscribedNotice).mockRejectedValue(new Error('smtp'));
    await expect(analyticsMailService.create(input(), 'admin-1')).resolves.toMatchObject({ id: ID });
    await new Promise((resolve) => setImmediate(resolve));
    expect(logs.server.error).toHaveBeenCalledWith(
      'analytics-mail',
      'subscribed-notice',
      expect.objectContaining({ to: 'ops@example.com' })
    );
  });

  it('refuses an address that is already subscribed', async () => {
    m(SubModel.findOne).mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ _id: 'x' }) }) });
    await expect(analyticsMailService.create(input(), 'a')).rejects.toThrow(/already subscribed/);
    expect(SubModel.create).not.toHaveBeenCalled();
  });

  const bad: Array<[string, Partial<AnalyticsMailSubscriptionInput>, RegExp]> = [
    ['an empty name', { name: ' ' }, /name/i],
    ['a long name', { name: 'n'.repeat(121) }, /name/i],
    ['an invalid email', { email: 'nope' }, /valid email/i],
    ['no dashboard', { pages: [] }, /at least one dashboard/i],
    ['an unknown dashboard', { pages: ['PODS', 'NOPE'] }, /not one this console has/],
    ['an unknown frequency', { frequency: 'HOURLY' as never }, /daily or weekly/i],
    ['an unsupported period', { days: 14 }, /7, 30, 90 or 365/],
  ];
  it.each(bad)('refuses %s', async (_label, over, message) => {
    await expect(analyticsMailService.create(input(over), 'a')).rejects.toThrow(message);
    expect(SubModel.create).not.toHaveBeenCalled();
  });

  it('treats missing name and email as invalid rather than crashing', async () => {
    await expect(
      analyticsMailService.create({ ...input(), name: undefined as never }, 'a')
    ).rejects.toThrow(/name/i);
    await expect(
      analyticsMailService.create({ ...input(), email: undefined as never }, 'a')
    ).rejects.toThrow(/valid email/i);
  });
});

describe('update / remove / sendNow', () => {
  it('updates an existing subscriber and excludes itself from the uniqueness check', async () => {
    m(SubModel.findById).mockResolvedValue(sub());
    noClash();
    m(SubModel.findByIdAndUpdate).mockReturnValue(orFail(sub({ days: 7 })));
    const out = await analyticsMailService.update(ID, input({ days: 7 }));
    expect(m(SubModel.findOne).mock.calls[0][0]).toEqual({ email: 'ops@example.com', _id: { $ne: ID } });
    expect(out.days).toBe(7);
  });

  it('refuses an unknown id, a missing subscriber and an address taken by another row', async () => {
    await expect(analyticsMailService.update('bad', input())).rejects.toThrow(/Unknown subscriber/);
    m(SubModel.findById).mockResolvedValue(null);
    await expect(analyticsMailService.update(ID, input())).rejects.toThrow(/not found/i);
    m(SubModel.findById).mockResolvedValue(sub());
    m(SubModel.findOne).mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ _id: 'other' }) }) });
    await expect(analyticsMailService.update(ID, input())).rejects.toThrow(/already subscribed/);
    expect(SubModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('removes an existing subscriber only', async () => {
    m(SubModel.findById).mockResolvedValueOnce(sub());
    m(SubModel.deleteOne).mockReturnValue({ exec: () => Promise.resolve({ deletedCount: 1 }) });
    expect(await analyticsMailService.remove(ID)).toBe(true);
    m(SubModel.findById).mockResolvedValueOnce(null);
    await expect(analyticsMailService.remove(ID)).rejects.toThrow(/not found/i);
    expect(SubModel.deleteOne).toHaveBeenCalledTimes(1);
  });

  it('sends now and reports whether it was sent, with the reason', async () => {
    m(SubModel.findById).mockResolvedValue(sub());
    m(sendAnalyticsReport).mockResolvedValueOnce({ status: 'SENT', reason: 'Sent to ops' });
    expect(await analyticsMailService.sendNow(ID)).toEqual({ ok: true, message: 'Sent to ops' });
    m(sendAnalyticsReport).mockResolvedValueOnce({ status: 'FAILED', reason: 'smtp down' });
    expect(await analyticsMailService.sendNow(ID)).toEqual({ ok: false, message: 'smtp down' });
  });
});

describe('runIfDue', () => {
  it('sends nothing when the schedule is switched off', async () => {
    m(AnalyticsMailSettingsModel.findOneAndUpdate).mockReturnValue(orFail({ ...settings, enabled: false }));
    expect(await analyticsMailService.runIfDue(NOW)).toBe(0);
    expect(SubModel.find).not.toHaveBeenCalled();
  });

  it('sends each due subscriber once, skipping not-due rows and rows claimed elsewhere', async () => {
    const due = sub({ _id: new Types.ObjectId(), last_sent_at: new Date('2026-03-14T03:30:00Z') });
    const notDue = sub({ _id: new Types.ObjectId() });
    const raced = sub({ _id: new Types.ObjectId() });
    const fresh = sub({ _id: new Types.ObjectId(), last_sent_at: null });
    m(SubModel.find).mockResolvedValue([notDue, due, raced, fresh]);
    m(isDue).mockImplementation((_s, _since, _now) => _since !== notDue.created_at);
    m(SubModel.updateOne)
      .mockReturnValueOnce({ exec: () => Promise.resolve({ modifiedCount: 1 }) })
      .mockReturnValueOnce({ exec: () => Promise.resolve({ modifiedCount: 0 }) })
      .mockReturnValueOnce({ exec: () => Promise.resolve({ modifiedCount: 1 }) });
    m(sendAnalyticsReport).mockResolvedValue({ status: 'SENT', reason: '' });

    expect(await analyticsMailService.runIfDue(NOW)).toBe(2);

    // the claim is conditional on last_sent_at still being what was read
    expect(m(SubModel.updateOne).mock.calls[0][0]).toEqual({ _id: due._id, last_sent_at: due.last_sent_at });
    expect(m(SubModel.updateOne).mock.calls[0][1]).toEqual({ $set: { last_sent_at: NOW } });
    expect(m(sendAnalyticsReport).mock.calls.map((c) => c[0])).toEqual([due, fresh]);
    // a never-sent subscriber is judged from the day they were added
    expect(m(isDue).mock.calls.some((c) => c[1] === fresh.created_at)).toBe(true);
  });

  it('defaults to the real clock', async () => {
    m(SubModel.find).mockResolvedValue([]);
    expect(await analyticsMailService.runIfDue()).toBe(0);
  });
});
