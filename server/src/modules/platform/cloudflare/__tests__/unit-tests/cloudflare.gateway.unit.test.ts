import {
  cloudflareActivationCheck,
  cloudflareConfig,
  cloudflareConfigOf,
  cloudflareCreateRecord,
  cloudflareCreateZone,
  cloudflareDeleteRecord,
  cloudflareRecords,
  cloudflareVerifyToken,
  cloudflareZone,
  requireCloudflareConfig,
  type CloudflareConfig,
} from '../../cloudflare.gateway';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { outboundFetch } from '@utils/outboundFetch';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

const fetchMock = outboundFetch as jest.Mock;
const cfg: CloudflareConfig = { apiToken: 'tok', accountId: 'acc', domain: 'duncit.com' };
const answer = (status: number, body: unknown) =>
  fetchMock.mockResolvedValueOnce({ status, ok: status < 400, json: body instanceof Error ? () => Promise.reject(body) : async () => body });
const lastCall = () => fetchMock.mock.calls.at(-1) as [string, string, RequestInit & { headers: Record<string, string> }];

describe('configuration', () => {
  it('trims the token and account and lower-cases the domain', () => {
    expect(cloudflareConfigOf(' t ', ' a ', ' Duncit.COM ')).toEqual({ apiToken: 't', accountId: 'a', domain: 'duncit.com' });
  });

  it.each([['', 'a', 'd.com'], ['t', '  ', 'd.com'], ['t', 'a', '']])('is null when %p / %p / %p has a blank part', (t, a, d) => {
    expect(cloudflareConfigOf(t, a, d)).toBeNull();
  });

  it('reads the entry from the Tech portal, null when incomplete, and demands it when required', async () => {
    (getRuntimeEnvValue as jest.Mock).mockImplementation(async (key: string) => ({ CLOUDFLARE_API_TOKEN: 'tok', CLOUDFLARE_ACCOUNT_ID: 'acc', CLOUDFLARE_DOMAIN: 'Duncit.com' })[key] ?? '');
    await expect(cloudflareConfig()).resolves.toEqual(cfg);
    await expect(requireCloudflareConfig()).resolves.toEqual(cfg);
    (getRuntimeEnvValue as jest.Mock).mockResolvedValue('');
    await expect(cloudflareConfig()).resolves.toBeNull();
    await expect(requireCloudflareConfig()).rejects.toMatchObject({
      message: expect.stringContaining('Tech → Environment Variables → Cloudflare'),
      extensions: { code: 'BAD_REQUEST' },
    });
  });
});

describe('calls', () => {
  it('signs a GET with the bearer token and sends no body', async () => {
    answer(200, { success: true, result: { status: 'active' } });
    await expect(cloudflareVerifyToken(cfg)).resolves.toBe('active');
    const [label, url, init] = lastCall();
    expect(label).toBe('Cloudflare');
    expect(url).toBe('https://api.cloudflare.com/client/v4/user/tokens/verify');
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual({ authorization: 'Bearer tok', accept: 'application/json' });
    expect(init.body).toBeUndefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('reports an unknown token status when Cloudflare gives none', async () => {
    answer(200, { success: true });
    await expect(cloudflareVerifyToken(cfg)).resolves.toBe('unknown');
    answer(200, { success: true, result: {} });
    await expect(cloudflareVerifyToken(cfg)).resolves.toBe('unknown');
  });

  it('sends a JSON body with a content type', async () => {
    answer(200, { success: true, result: { id: 'z1', name: 'duncit.com', status: 'pending' } });
    await expect(cloudflareCreateZone(cfg)).resolves.toMatchObject({ id: 'z1' });
    const [, url, init] = lastCall();
    expect(url).toBe('https://api.cloudflare.com/client/v4/zones');
    expect(init.headers['content-type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'duncit.com', account: { id: 'acc' }, type: 'full' });
  });

  it('treats an empty or unreadable success body as an empty envelope', async () => {
    answer(200, null);
    await expect(cloudflareVerifyToken(cfg)).resolves.toBe('unknown');
    answer(200, new Error('not json'));
    await expect(cloudflareVerifyToken(cfg)).resolves.toBe('unknown');
  });
});

describe('refusals', () => {
  it.each([
    [400, 'Cloudflare refused the request.', 'BAD_USER_INPUT'],
    [401, 'Cloudflare refused the API token.', 'BAD_GATEWAY'],
    [403, 'The Cloudflare token is missing a permission.', 'BAD_GATEWAY'],
    [404, 'Cloudflare has no such zone or record in this account.', 'BAD_GATEWAY'],
    [429, 'Cloudflare is rate-limiting this token.', 'BAD_GATEWAY'],
    [500, 'Cloudflare answered HTTP 500.', 'BAD_GATEWAY'],
  ])('explains HTTP %i in words an operator can act on', async (status, text, code) => {
    answer(status, {});
    await expect(cloudflareVerifyToken(cfg)).rejects.toMatchObject({
      message: expect.stringContaining(text),
      extensions: { code, cloudflare_status: status },
    });
  });

  it('adds Cloudflare’s own reasons, skipping blank ones', async () => {
    answer(400, { errors: [{ message: 'Invalid record' }, {}, { message: 'TTL too low' }] });
    await expect(cloudflareVerifyToken(cfg)).rejects.toMatchObject({
      message: 'Cloudflare refused the request. Cloudflare said: Invalid record · TTL too low',
    });
  });

  it('refuses a 200 that says success: false', async () => {
    answer(200, { success: false, errors: [{ message: 'nope' }] });
    await expect(cloudflareVerifyToken(cfg)).rejects.toMatchObject({ message: expect.stringContaining('Cloudflare said: nope') });
  });

  it('refuses with the plain explanation when the error body is not JSON', async () => {
    answer(502, new Error('<html>'));
    await expect(cloudflareVerifyToken(cfg)).rejects.toMatchObject({ message: 'Cloudflare answered HTTP 502.' });
  });
});

describe('zones', () => {
  it('finds the configured domain’s zone in this account', async () => {
    answer(200, { success: true, result: [{ id: 'z1', name: 'duncit.com', status: 'active' }] });
    await expect(cloudflareZone(cfg)).resolves.toMatchObject({ id: 'z1' });
    expect(lastCall()[1]).toBe('https://api.cloudflare.com/client/v4/zones?name=duncit.com&account.id=acc');
  });

  it('is null before the zone has been added, whatever shape Cloudflare answers with', async () => {
    answer(200, { success: true, result: [] });
    await expect(cloudflareZone(cfg)).resolves.toBeNull();
    answer(200, { success: true });
    await expect(cloudflareZone(cfg)).resolves.toBeNull();
  });

  it('asks Cloudflare to re-check the nameservers now', async () => {
    answer(200, { success: true });
    await expect(cloudflareActivationCheck(cfg, 'z/1')).resolves.toBeUndefined();
    expect(lastCall()[1]).toBe('https://api.cloudflare.com/client/v4/zones/z%2F1/activation_check');
    expect(lastCall()[2].method).toBe('PUT');
  });
});

describe('records', () => {
  const rec = (id: string) => ({ id, type: 'A', name: `${id}.duncit.com`, content: '1.2.3.4', ttl: 300 });

  it('reads a single page of records', async () => {
    answer(200, { success: true, result: [rec('a')], result_info: { total_pages: 1 } });
    await expect(cloudflareRecords(cfg, 'z1')).resolves.toEqual([rec('a')]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(lastCall()[1]).toBe('https://api.cloudflare.com/client/v4/zones/z1/dns_records?per_page=1000&page=1');
  });

  it('reads the remaining pages together once the first says how many there are', async () => {
    answer(200, { success: true, result: [rec('a')], result_info: { total_pages: 3 } });
    answer(200, { success: true, result: [rec('b')] });
    answer(200, { success: true, result: [rec('c')] });
    await expect(cloudflareRecords(cfg, 'z1')).resolves.toEqual([rec('a'), rec('b'), rec('c')]);
    expect(fetchMock.mock.calls.map((c) => c[1].split('&page=')[1])).toEqual(['1', '2', '3']);
  });

  it('reads one page when Cloudflare gives no paging info, and nothing when it gives no result', async () => {
    answer(200, { success: true, result: [rec('a')] });
    await expect(cloudflareRecords(cfg, 'z1')).resolves.toEqual([rec('a')]);
    answer(200, { success: true });
    await expect(cloudflareRecords(cfg, 'z1')).resolves.toEqual([]);
    answer(200, { success: true, result_info: { total_pages: 0 } });
    await expect(cloudflareRecords(cfg, 'z1')).resolves.toEqual([]);
    answer(200, { success: true, result: [rec('a')], result_info: { total_pages: 2 } });
    answer(200, { success: true });
    await expect(cloudflareRecords(cfg, 'z1')).resolves.toEqual([rec('a')]);
  });

  it('creates and deletes a record by encoded id', async () => {
    answer(200, { success: true });
    await cloudflareCreateRecord(cfg, 'z1', { type: 'TXT', name: 'x', content: 'v', ttl: 300, comment: 'copied' });
    expect(lastCall()[1]).toBe('https://api.cloudflare.com/client/v4/zones/z1/dns_records');
    expect(JSON.parse(lastCall()[2].body as string)).toEqual({ type: 'TXT', name: 'x', content: 'v', ttl: 300, comment: 'copied' });
    answer(200, { success: true });
    await cloudflareDeleteRecord(cfg, 'z1', 'r/1');
    expect(lastCall()[1]).toBe('https://api.cloudflare.com/client/v4/zones/z1/dns_records/r%2F1');
    expect(lastCall()[2].method).toBe('DELETE');
  });
});
