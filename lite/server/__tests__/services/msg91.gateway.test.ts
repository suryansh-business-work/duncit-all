import { afterEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { envEntryService } from '../../services/envEntry.service';
import { activeMsg91, msg91CredentialsFrom, msg91Probe, msg91SendOtp, msg91VerifyOtp } from '../../services/msg91.gateway';

const creds = { widget_id: 'widget-1', auth_key: 'auth-1', default_country_code: '91' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => {
  vi.restoreAllMocks();
});

/** The URL, init and parsed JSON body of the one fetch call made. */
function sent(spy: MockInstance<typeof fetch>) {
  expect(spy).toHaveBeenCalledTimes(1);
  const [input, init] = spy.mock.calls[0];
  return { url: String(input), init, body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null };
}

describe('msg91CredentialsFrom', () => {
  it('needs both the widget id and the auth key', () => {
    expect(msg91CredentialsFrom(null)).toBeNull();
    expect(msg91CredentialsFrom({ widget_id: 'w' })).toBeNull();
    expect(msg91CredentialsFrom({ auth_key: 'k' })).toBeNull();
    expect(msg91CredentialsFrom({ widget_id: ' ', auth_key: 'k' })).toBeNull();
  });

  it('defaults the country code to India and keeps a configured one', () => {
    expect(msg91CredentialsFrom({ widget_id: 'w', auth_key: 'k' })).toEqual({ widget_id: 'w', auth_key: 'k', default_country_code: '91' });
    expect(msg91CredentialsFrom({ widget_id: 'w', auth_key: 'k', default_country_code: 44 })?.default_country_code).toBe('44');
  });
});

describe('activeMsg91', () => {
  it('reads the active MSG91 entry', async () => {
    const active = vi.spyOn(envEntryService, 'activeConfig').mockResolvedValue({ widget_id: 'w', auth_key: 'k' });
    await expect(activeMsg91()).resolves.toEqual({ widget_id: 'w', auth_key: 'k', default_country_code: '91' });
    expect(active).toHaveBeenCalledWith('MSG91');
  });

  it('answers null when phone sign-in has no carrier', async () => {
    vi.spyOn(envEntryService, 'activeConfig').mockResolvedValue(null);
    await expect(activeMsg91()).resolves.toBeNull();
  });
});

describe('msg91SendOtp', () => {
  it('posts the widget id and identifier with the auth key header and returns the request id', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ type: 'success', message: 'req-123' }));
    await expect(msg91SendOtp(creds, '919876543210')).resolves.toEqual({ ok: true, message: 'req-123' });
    const { url, init, body } = sent(spy);
    expect(url).toBe('https://api.msg91.com/api/v5/widget/sendOtp');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ authkey: 'auth-1', 'content-type': 'application/json' });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(body).toEqual({ widgetId: 'widget-1', identifier: '919876543210' });
  });

  it('reports a refusal sent with HTTP 200 as a failure, with MSG91 reason', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ type: 'error', message: 'Mobile number not valid' }));
    await expect(msg91SendOtp(creds, '919876543210')).resolves.toEqual({ ok: false, message: 'Mobile number not valid' });
  });

  it('falls back to the error field, then to the HTTP status', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ error: 'IP blocked' }, 403))
      .mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 }));
    await expect(msg91SendOtp(creds, '919876543210')).resolves.toEqual({ ok: false, message: 'IP blocked' });
    await expect(msg91SendOtp(creds, '919876543210')).resolves.toEqual({ ok: false, message: 'HTTP 502' });
  });

  it('answers an empty request id when a success carries none', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ type: 'success' }));
    await expect(msg91SendOtp(creds, '919876543210')).resolves.toEqual({ ok: true, message: '' });
  });

  it('lets a wire failure throw', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
    await expect(msg91SendOtp(creds, '919876543210')).rejects.toThrow('fetch failed');
  });
});

describe('msg91VerifyOtp', () => {
  it('asks MSG91 about the request id and the typed code', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ type: 'success', message: 'OTP verified success' }));
    await expect(msg91VerifyOtp(creds, 'req-123', '424242')).resolves.toEqual({ ok: true, message: 'OTP verified success' });
    const { url, body } = sent(spy);
    expect(url).toBe('https://api.msg91.com/api/v5/widget/verifyOtp');
    expect(body).toEqual({ widgetId: 'widget-1', reqId: 'req-123', otp: '424242' });
  });

  it('reports a wrong code as not ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ type: 'error', message: 'OTP not match' }));
    await expect(msg91VerifyOtp(creds, 'req-123', '000000')).resolves.toEqual({ ok: false, message: 'OTP not match' });
  });
});

describe('msg91Probe', () => {
  it("reads today's widget analytics with the auth key, sending no SMS", async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ data: [] }));
    const result = await msg91Probe(creds);
    expect(result).toEqual({ ok: true, message: 'MSG91 accepted this auth key. The widget id is proven by the first real sign-in code.' });
    const { url, init } = sent(spy);
    const today = new Date().toISOString().slice(0, 10);
    expect(url).toBe(`https://control.msg91.com/api/v5/report/analytics/p/widget?startDate=${today}&endDate=${today}`);
    expect(init?.headers).toMatchObject({ Authkey: 'auth-1' });
    expect(init?.method).toBeUndefined();
  });

  it('reports a refused key from the status, an error field or a fail status', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ message: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(json({ error: 'Invalid authkey' }))
      .mockResolvedValueOnce(json({ status: 'fail' }));
    await expect(msg91Probe(creds)).resolves.toEqual({ ok: false, message: 'MSG91 refused the auth key: Unauthorized' });
    await expect(msg91Probe(creds)).resolves.toEqual({ ok: false, message: 'MSG91 refused the auth key: Invalid authkey' });
    await expect(msg91Probe(creds)).resolves.toEqual({ ok: false, message: 'MSG91 refused the auth key: HTTP 200' });
  });

  it('reports a network failure instead of throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('getaddrinfo ENOTFOUND control.msg91.com')).mockRejectedValueOnce('socket hang up');
    await expect(msg91Probe(creds)).resolves.toEqual({ ok: false, message: 'MSG91 could not be reached: getaddrinfo ENOTFOUND control.msg91.com' });
    await expect(msg91Probe(creds)).resolves.toEqual({ ok: false, message: 'MSG91 could not be reached: socket hang up' });
  });
});
