import {
  MSG91_RETRY_CHANNELS,
  msg91Identifier,
  msg91RetryOtp,
  msg91SendOtp,
  msg91VerifyAccessToken,
  msg91VerifyOtp,
  msg91WidgetAnalytics,
  msg91WidgetLogs,
  runtimeMsg91Credentials,
} from '../../msg91.gateway';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { outboundFetch } from '@utils/outboundFetch';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

const fetchMock = outboundFetch as jest.Mock;
const creds = { widget_id: 'w1', auth_key: 'k1' };
const answer = (status: number, body: unknown) =>
  fetchMock.mockResolvedValue({ status, ok: status < 400, json: body instanceof Error ? () => Promise.reject(body) : async () => body });
const lastCall = () => fetchMock.mock.calls.at(-1) as [string, string, RequestInit & { headers: Record<string, string> }];

describe('runtimeMsg91Credentials', () => {
  it('returns the widget id and auth key from the Tech entry', async () => {
    (getRuntimeEnvValue as jest.Mock).mockImplementation(async (key: string) => (key === 'MSG91_WIDGET_ID' ? 'w' : 'a'));
    await expect(runtimeMsg91Credentials()).resolves.toEqual({ widget_id: 'w', auth_key: 'a' });
  });

  it.each([['', 'a'], ['w', ''], ['', '']])('is null when widget %p / key %p is missing', async (widget, key) => {
    (getRuntimeEnvValue as jest.Mock).mockImplementation(async (name: string) => (name === 'MSG91_WIDGET_ID' ? widget : key));
    await expect(runtimeMsg91Credentials()).resolves.toBeNull();
  });
});

describe('msg91Identifier', () => {
  it('joins country code and number as digits only', () => {
    expect(msg91Identifier('+91', '98765 43210')).toBe('919876543210');
    expect(msg91Identifier('', '(555) 123-4567')).toBe('5551234567');
  });
});

describe('widget calls', () => {
  it('sends an OTP and reports the request id on success', async () => {
    answer(200, { type: 'success', message: 'req-123' });
    await expect(msg91SendOtp(creds, '919876543210')).resolves.toEqual({ ok: true, message: 'req-123', code: '' });
    const [label, url, init] = lastCall();
    expect(label).toBe('MSG91');
    expect(url).toBe('https://api.msg91.com/api/v5/widget/sendOtp');
    expect(init).toMatchObject({ method: 'POST', headers: { authkey: 'k1', 'content-type': 'application/json', accept: 'application/json' } });
    expect(JSON.parse(init.body as string)).toEqual({ widgetId: 'w1', identifier: '919876543210' });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('reports a success with no message as an empty one', async () => {
    answer(200, { type: 'success' });
    await expect(msg91SendOtp(creds, '1')).resolves.toEqual({ ok: true, message: '', code: '' });
  });

  it('reports MSG91 refusals as values, even under HTTP 200, with its code', async () => {
    answer(200, { type: 'error', message: 'Invalid widget', code: '401' });
    await expect(msg91SendOtp(creds, '1')).resolves.toEqual({ ok: false, message: 'Invalid widget', code: '401' });
  });

  it.each([
    [{ error: 'bad key' }, 'bad key'],
    [{ errors: 'many' }, 'many'],
    [{}, 'HTTP 502'],
  ])('finds the reason in %j and falls back to the status code', async (body, reason) => {
    answer(502, body);
    await expect(msg91SendOtp(creds, '1')).resolves.toEqual({ ok: false, message: reason, code: '502' });
  });

  it('keeps the status when the body is not JSON (a gateway error page)', async () => {
    answer(503, new Error('<html>'));
    await expect(msg91SendOtp(creds, '1')).resolves.toEqual({ ok: false, message: 'HTTP 503', code: '503' });
  });

  it('retries a code, over another channel only when one is asked for', async () => {
    answer(200, { type: 'success', message: 'ok' });
    await msg91RetryOtp(creds, 'req1');
    expect(lastCall()[1]).toMatch(/\/retryOtp$/);
    expect(JSON.parse(lastCall()[2].body as string)).toEqual({ widgetId: 'w1', reqId: 'req1' });
    await msg91RetryOtp(creds, 'req1', null);
    expect(JSON.parse(lastCall()[2].body as string)).toEqual({ widgetId: 'w1', reqId: 'req1' });
    await msg91RetryOtp(creds, 'req1', MSG91_RETRY_CHANNELS.VOICE);
    expect(JSON.parse(lastCall()[2].body as string)).toEqual({ widgetId: 'w1', reqId: 'req1', retryChannel: 4 });
  });

  it('verifies a code and an access token', async () => {
    answer(200, { type: 'success', message: 'access-token-1' });
    await expect(msg91VerifyOtp(creds, 'req1', '1234')).resolves.toMatchObject({ ok: true, message: 'access-token-1' });
    expect(lastCall()[1]).toMatch(/\/verifyOtp$/);
    expect(JSON.parse(lastCall()[2].body as string)).toEqual({ widgetId: 'w1', reqId: 'req1', otp: '1234' });
    await msg91VerifyAccessToken(creds, 'tok');
    expect(lastCall()[1]).toMatch(/\/verifyAccessToken$/);
    expect(JSON.parse(lastCall()[2].body as string)).toEqual({ 'access-token': 'tok' });
  });
});

describe('widget reports', () => {
  const range = { startDate: '2026-03-01', endDate: '2026-03-02' };

  it('reads the request log for a window, with MSG91’s own total', async () => {
    answer(200, { data: [{ requestId: 'r1' }, { requestId: 'r2' }], metadata: { total: 17 } });
    await expect(msg91WidgetLogs(creds, range)).resolves.toEqual({ rows: [{ requestId: 'r1' }, { requestId: 'r2' }], total: 17 });
    const [, url, init] = lastCall();
    expect(url).toBe('https://control.msg91.com/api/v5/report/logs/p/widget?startDate=2026-03-01&endDate=2026-03-02');
    expect(init.headers).toEqual({ Authkey: 'k1', accept: 'application/json' });
  });

  it('counts the rows when MSG91 gives no total, and has none for a non-list', async () => {
    answer(200, { data: [{ requestId: 'r1' }] });
    await expect(msg91WidgetLogs(creds, range)).resolves.toEqual({ rows: [{ requestId: 'r1' }], total: 1 });
    answer(200, { data: 'nope' });
    await expect(msg91WidgetLogs(creds, range)).resolves.toEqual({ rows: [], total: 0 });
  });

  it('reads per-day analytics with the window total', async () => {
    answer(200, { data: [{ date: '2026-03-01', total: 4 }], total: { total: 4 } });
    await expect(msg91WidgetAnalytics(creds, range)).resolves.toEqual({ days: [{ date: '2026-03-01', total: 4 }], total: { total: 4, date: '' } });
    expect(lastCall()[1]).toContain('/analytics/p/widget?');
  });

  it('has no window total when MSG91 sends none, and no days for a non-list', async () => {
    answer(200, { data: 'x' });
    await expect(msg91WidgetAnalytics(creds, range)).resolves.toEqual({ days: [], total: null });
  });

  it.each([
    [200, { error: 'Unauthorized' }, 'Unauthorized'],
    [200, { status: 'fail', message: 'Duration exceeds 3 days' }, 'Duration exceeds 3 days'],
    [500, {}, 'HTTP 500'],
  ])('surfaces a refused report (%s %j) to the operator as the reason', async (status, body, reason) => {
    answer(status, body);
    await expect(msg91WidgetLogs(creds, range)).rejects.toMatchObject({
      message: `MSG91 refused the report: ${reason}`,
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });
});
