jest.mock('../../alerts/analyticsAlert.model', () => ({
  ANALYTICS_ALERT_CONDITIONS: ['ABOVE', 'BELOW', 'RISES_BY', 'FALLS_BY'],
  AnalyticsAlertModel: { find: jest.fn(), findById: jest.fn(), create: jest.fn(), deleteOne: jest.fn() },
}));
jest.mock('../../alerts/analyticsAlert.check', () => ({ checkAlert: jest.fn() }));

import { Types } from 'mongoose';
import { AnalyticsAlertModel } from '../../alerts/analyticsAlert.model';
import { checkAlert } from '../../alerts/analyticsAlert.check';
import { analyticsAlertService, type AnalyticsAlertInput } from '../../alerts/analyticsAlert.service';

const m = (fn: unknown) => fn as jest.Mock;
const ID = new Types.ObjectId().toHexString();

const input = (over: Partial<AnalyticsAlertInput> = {}): AnalyticsAlertInput => ({
  name: '  Cancels high ',
  entity: 'PODS',
  kpi_key: 'cancel_rate',
  condition: 'ABOVE',
  threshold: 8,
  days: 30,
  emails: [' Ops@Example.com ', 'ops@example.com'],
  slack: false,
  is_active: true,
  ...over,
});

const stored = (over: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(ID),
  name: 'Cancels high',
  entity: 'PODS',
  kpi_key: 'cancel_rate',
  condition: 'ABOVE',
  threshold: 8,
  days: 30,
  emails: ['ops@example.com'],
  slack: false,
  is_active: true,
  last_checked_at: null,
  last_value: null,
  last_status: null,
  last_error: null,
  last_notified_at: null,
  created_at: new Date('2026-03-01T00:00:00Z'),
  set: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('create', () => {
  it('trims, lower-cases and de-duplicates before storing, and presents the saved alert', async () => {
    m(AnalyticsAlertModel.create).mockResolvedValue(stored());
    const out = await analyticsAlertService.create(input(), 'admin-1');
    expect(m(AnalyticsAlertModel.create).mock.calls[0][0]).toMatchObject({
      name: 'Cancels high',
      emails: ['ops@example.com'],
      created_by: 'admin-1',
    });
    expect(out).toMatchObject({ id: ID, last_checked_at: null, created_at: '2026-03-01T00:00:00.000Z' });
  });

  it('presents timestamps of an alert that has been checked', async () => {
    const at = new Date('2026-03-10T00:00:00Z');
    m(AnalyticsAlertModel.create).mockResolvedValue(stored({ last_checked_at: at, last_notified_at: at }));
    const out = await analyticsAlertService.create(input(), 'admin-1');
    expect(out.last_checked_at).toBe(at.toISOString());
    expect(out.last_notified_at).toBe(at.toISOString());
  });

  it('allows a Slack-only alert with no addresses', async () => {
    m(AnalyticsAlertModel.create).mockResolvedValue(stored({ emails: [], slack: true }));
    await analyticsAlertService.create(input({ emails: [], slack: true }), 'admin-1');
    expect(m(AnalyticsAlertModel.create).mock.calls[0][0]).toMatchObject({ emails: [], slack: true });
  });

  const bad: Array<[string, Partial<AnalyticsAlertInput>, RegExp]> = [
    ['an empty name', { name: '   ' }, /name/i],
    ['a name over 120 characters', { name: 'x'.repeat(121) }, /name/i],
    ['an unknown dashboard', { entity: 'NOPE' }, /dashboard/i],
    ['a malformed tile key', { kpi_key: 'Bad Key' }, /tile/i],
    ['an unknown condition', { condition: 'EQUALS' as never }, /trip/i],
    ['a non-finite threshold', { threshold: Number.NaN }, /number/i],
    ['an unsupported period', { days: 45 }, /period/i],
    ['an invalid address', { emails: ['not-an-email'] }, /valid email/i],
    ['too many recipients', { emails: Array.from({ length: 21 }, (_, i) => `u${i}@example.com`) }, /at most 20/],
    ['no recipient and no Slack', { emails: [], slack: false }, /address to mail/i],
  ];
  it.each(bad)('refuses %s', async (_label, over, message) => {
    await expect(analyticsAlertService.create(input(over), 'admin-1')).rejects.toThrow(message);
    expect(AnalyticsAlertModel.create).not.toHaveBeenCalled();
  });

  it('treats a missing name and missing addresses as invalid input rather than crashing', async () => {
    await expect(
      analyticsAlertService.create({ ...input({ slack: true }), name: undefined as never }, 'a')
    ).rejects.toThrow(/name/i);
    m(AnalyticsAlertModel.create).mockResolvedValue(stored({ emails: [], slack: true }));
    await expect(
      analyticsAlertService.create({ ...input({ slack: true }), emails: undefined as never }, 'a')
    ).resolves.toMatchObject({ emails: [] });
  });
});

describe('list', () => {
  it('returns the alerts newest first', async () => {
    const sort = jest.fn().mockResolvedValue([stored(), stored({ name: 'Second' })]);
    m(AnalyticsAlertModel.find).mockReturnValue({ sort });
    const out = await analyticsAlertService.list();
    expect(sort).toHaveBeenCalledWith({ created_at: -1 });
    expect(out.map((a) => a.name)).toEqual(['Cancels high', 'Second']);
  });
});

describe('update', () => {
  it('resets the last verdict so a changed rule gets its first notice', async () => {
    const doc = stored();
    m(AnalyticsAlertModel.findById).mockResolvedValue(doc);
    await analyticsAlertService.update(ID, input({ threshold: 15 }));
    expect(doc.set).toHaveBeenCalledWith(
      expect.objectContaining({
        threshold: 15,
        last_status: null,
        last_error: null,
        last_notified_at: null,
        last_checked_at: null,
      })
    );
    expect(doc.save).toHaveBeenCalled();
  });

  it('refuses a malformed id and reports a missing alert', async () => {
    await expect(analyticsAlertService.update('nope', input())).rejects.toThrow(/Unknown alert/);
    m(AnalyticsAlertModel.findById).mockResolvedValue(null);
    await expect(analyticsAlertService.update(ID, input())).rejects.toThrow(/not found/i);
  });

  it('does not touch the alert when the new input is invalid', async () => {
    const doc = stored();
    m(AnalyticsAlertModel.findById).mockResolvedValue(doc);
    await expect(analyticsAlertService.update(ID, input({ days: 1 }))).rejects.toThrow(/period/i);
    expect(doc.save).not.toHaveBeenCalled();
  });
});

describe('remove / checkNow', () => {
  it('deletes an existing alert', async () => {
    m(AnalyticsAlertModel.findById).mockResolvedValue(stored());
    m(AnalyticsAlertModel.deleteOne).mockReturnValue({ exec: () => Promise.resolve({ deletedCount: 1 }) });
    expect(await analyticsAlertService.remove(ID)).toBe(true);
    expect(m(AnalyticsAlertModel.deleteOne).mock.calls[0][0]).toEqual({ _id: ID });
  });

  it('does not delete an alert that does not exist', async () => {
    m(AnalyticsAlertModel.findById).mockResolvedValue(null);
    await expect(analyticsAlertService.remove(ID)).rejects.toThrow(/not found/i);
    expect(AnalyticsAlertModel.deleteOne).not.toHaveBeenCalled();
  });

  it('checks now with force so a tripped alert tells people inside the reminder window', async () => {
    const doc = stored();
    m(AnalyticsAlertModel.findById).mockResolvedValue(doc);
    m(checkAlert).mockResolvedValue({
      status: 'TRIGGERED',
      value: 12,
      error: null,
      notified: true,
      tripped: { secret: 'internal' },
    });
    const out = await analyticsAlertService.checkNow(ID);
    expect(m(checkAlert).mock.calls[0]).toEqual([doc, { force: true }]);
    expect(out).toEqual({ status: 'TRIGGERED', value: 12, error: null, notified: true });
  });
});
