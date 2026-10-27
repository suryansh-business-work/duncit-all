import { msg91Service } from '../../msg91.service';
import { msg91Resolvers } from '../../msg91.resolver';
import { msg91WidgetAnalytics, msg91WidgetLogs, runtimeMsg91Credentials } from '../../msg91.gateway';
import { makeContext } from '@test/harness';

jest.mock('../../msg91.gateway', () => ({
  MSG91_LOGS_MAX_DAYS: 3,
  MSG91_ANALYTICS_MAX_DAYS: 5,
  msg91WidgetLogs: jest.fn(),
  msg91WidgetAnalytics: jest.fn(),
  runtimeMsg91Credentials: jest.fn(),
}));

const CREDS = { widget_id: 'w', auth_key: 'k' };
beforeEach(() => (runtimeMsg91Credentials as jest.Mock).mockResolvedValue(CREDS));

describe('configured', () => {
  it('is true only when the widget credentials exist', async () => {
    await expect(msg91Service.configured()).resolves.toBe(true);
    (runtimeMsg91Credentials as jest.Mock).mockResolvedValue(null);
    await expect(msg91Service.configured()).resolves.toBe(false);
  });
});

describe('window validation (logs and analytics share it)', () => {
  it.each([
    ['not dates', 'soon', '2026-03-02', 'Dates must be yyyy-MM-dd'],
    ['a missing end', '2026-03-01', '', 'Dates must be yyyy-MM-dd'],
    ['an impossible date', '2026-13-01', '2026-03-02', 'Dates must be real calendar dates'],
    ['an end before the start', '2026-03-05', '2026-03-01', 'The start date must not be after the end date'],
    ['a window that is too wide', '2026-03-01', '2026-03-05', 'MSG91 allows at most 3 days in one window'],
  ])('refuses %s before calling MSG91', async (_label, start, end, message) => {
    await expect(msg91Service.logs(start, end)).rejects.toMatchObject({ message, extensions: { code: 'BAD_USER_INPUT' } });
    expect(msg91WidgetLogs).not.toHaveBeenCalled();
  });

  it('allows analytics five days where logs allow three', async () => {
    (msg91WidgetAnalytics as jest.Mock).mockResolvedValue({ days: [], total: null });
    await expect(msg91Service.analytics('2026-03-01', '2026-03-06')).resolves.toEqual({ days: [], total: null });
    await expect(msg91Service.analytics('2026-03-01', '2026-03-07')).rejects.toMatchObject({ message: 'MSG91 allows at most 5 days in one window' });
  });

  it('trims the dates it sends and accepts a same-day window', async () => {
    (msg91WidgetLogs as jest.Mock).mockResolvedValue({ rows: [], total: 0 });
    await msg91Service.logs(' 2026-03-01 ', '2026-03-01');
    expect(msg91WidgetLogs).toHaveBeenCalledWith(CREDS, { startDate: '2026-03-01', endDate: '2026-03-01' });
  });

  it('refuses a missing date given as nothing at all', async () => {
    await expect(msg91Service.logs(undefined as never, null as never)).rejects.toMatchObject({ message: 'Dates must be yyyy-MM-dd' });
  });

  it('says where to configure MSG91 when the credentials are missing', async () => {
    (runtimeMsg91Credentials as jest.Mock).mockResolvedValue(null);
    await expect(msg91Service.logs('2026-03-01', '2026-03-02')).rejects.toMatchObject({
      message: expect.stringContaining('Tech → Environment → MSG91'),
      extensions: { code: 'BAD_REQUEST' },
    });
    await expect(msg91Service.analytics('2026-03-01', '2026-03-02')).rejects.toMatchObject({ extensions: { code: 'BAD_REQUEST' } });
  });
});

describe('logs', () => {
  it('maps MSG91 rows to the portal shape, reading its clock as IST', async () => {
    (msg91WidgetLogs as jest.Mock).mockResolvedValue({
      total: 9,
      rows: [
        { requestId: 'r1', identifier: '9198', requestTime: '2026-03-01 10:30:00', verified: true, tokenVerified: true, verifyRetryCount: 2, retryCount: 1, userIp: '1.2.3.4', sms: 1, whatsapp: 2, email: 3, voice: 4 },
        { requestTime: 'garbage' },
        {},
        { requestTime: 12345 },
        { requestTime: {} },
      ],
    });
    const out = await msg91Service.logs('2026-03-01', '2026-03-02');
    expect(out.total).toBe(9);
    expect(out.rows[0]).toEqual({
      request_id: 'r1', identifier: '9198', requested_at: '2026-03-01T05:00:00.000Z', verified: true, token_verified: true,
      verify_attempts: 2, retries: 1, user_ip: '1.2.3.4', sms: 1, whatsapp: 2, email: 3, voice: 4,
    });
    expect(out.rows[1]).toMatchObject({ requested_at: '', verified: false, token_verified: false, verify_attempts: 0, retries: 0, user_ip: '', request_id: '' });
    expect(out.rows[2].requested_at).toBe('');
    expect(out.rows[3].requested_at).toBe('');
    expect(out.rows[4].requested_at).toBe('');
  });
});

describe('analytics', () => {
  it('maps days and the window total, defaulting missing counts to zero', async () => {
    (msg91WidgetAnalytics as jest.Mock).mockResolvedValue({
      days: [{ date: '2026-03-01', total: 4, verified: 3, tokenVerified: 2, retry: 1, sms: 4, whatsapp: 0, email: 0, voice: 0 }, {}],
      total: { date: '', total: 10 },
    });
    const out = await msg91Service.analytics('2026-03-01', '2026-03-02');
    expect(out.days[0]).toEqual({ date: '2026-03-01', total: 4, verified: 3, token_verified: 2, retries: 1, sms: 4, whatsapp: 0, email: 0, voice: 0 });
    expect(out.days[1]).toEqual({ date: '', total: 0, verified: 0, token_verified: 0, retries: 0, sms: 0, whatsapp: 0, email: 0, voice: 0 });
    expect(out.total).toMatchObject({ total: 10, date: '' });
  });

  it('has no total when MSG91 sends none', async () => {
    (msg91WidgetAnalytics as jest.Mock).mockResolvedValue({ days: [], total: null });
    await expect(msg91Service.analytics('2026-03-01', '2026-03-02')).resolves.toEqual({ days: [], total: null });
  });
});

describe('resolvers', () => {
  const Q = msg91Resolvers.Query as Record<string, (...a: any[]) => any>;
  const tech = makeContext({ id: 't', roles: ['TECH_MANAGER'] });
  const logsReader = makeContext({ id: 'l', roles: ['LOGS_MANAGER'] });
  const comms = makeContext({ id: 'c', roles: ['COMMUNICATIONS_MANAGER'] });
  const outsider = makeContext({ id: 'o', roles: ['USER'] });

  it('lets the owning consoles read configuration and logs, and only some read analytics', async () => {
    (msg91WidgetLogs as jest.Mock).mockResolvedValue({ rows: [], total: 0 });
    (msg91WidgetAnalytics as jest.Mock).mockResolvedValue({ days: [], total: null });
    await expect(Q.msg91Configured({}, {}, logsReader)).resolves.toBe(true);
    await expect(Q.msg91WidgetLogs({}, { start_date: '2026-03-01', end_date: '2026-03-02' }, logsReader)).resolves.toEqual({ rows: [], total: 0 });
    await expect(Q.msg91WidgetAnalytics({}, { start_date: '2026-03-01', end_date: '2026-03-02' }, comms)).resolves.toEqual({ days: [], total: null });
    await expect(Q.msg91WidgetAnalytics({}, { start_date: '2026-03-01', end_date: '2026-03-02' }, tech)).resolves.toBeDefined();
  });

  it('refuses everyone else, and the Logs console for analytics', () => {
    expect(() => Q.msg91Configured({}, {}, outsider)).toThrow('Access Denied');
    expect(() => Q.msg91WidgetLogs({}, { start_date: 'a', end_date: 'b' }, outsider)).toThrow('Access Denied');
    expect(() => Q.msg91WidgetAnalytics({}, { start_date: 'a', end_date: 'b' }, logsReader)).toThrow('Access Denied');
  });
});
