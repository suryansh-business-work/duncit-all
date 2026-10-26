import {
  godaddyAddRecords,
  godaddyConfig,
  godaddyConfigOf,
  godaddyDeleteSet,
  godaddyDomain,
  godaddyRecordSet,
  godaddyRecords,
  godaddyReplaceSet,
  godaddySetNameServers,
  requireGodaddyConfig,
  type GodaddyConfig,
} from '../../godaddy.gateway';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { outboundFetch } from '@utils/outboundFetch';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

const fetchMock = outboundFetch as jest.Mock;
const cfg: GodaddyConfig = { apiKey: 'key', apiSecret: 'secret', domain: 'duncit.com' };
const answer = (status: number, body: unknown) =>
  fetchMock.mockResolvedValueOnce({ status, ok: status < 400, json: body instanceof Error ? () => Promise.reject(body) : async () => body });
const lastCall = () => fetchMock.mock.calls.at(-1) as [string, string, RequestInit & { headers: Record<string, string> }];

describe('configuration', () => {
  it('trims the key and secret and lower-cases the domain', () => {
    expect(godaddyConfigOf(' k ', ' s ', ' Duncit.COM ')).toEqual({ apiKey: 'k', apiSecret: 's', domain: 'duncit.com' });
  });

  it.each([['', 's', 'd.com'], ['k', ' ', 'd.com'], ['k', 's', '']])('is null when %p / %p / %p has a blank part', (k, s, d) => {
    expect(godaddyConfigOf(k, s, d)).toBeNull();
  });

  it('reads the entry from the Tech portal, null when incomplete, and demands it when required', async () => {
    (getRuntimeEnvValue as jest.Mock).mockImplementation(async (key: string) => ({ GODADDY_API_KEY: 'key', GODADDY_API_SECRET: 'secret', GODADDY_DOMAIN: 'Duncit.com' })[key] ?? '');
    await expect(godaddyConfig()).resolves.toEqual(cfg);
    await expect(requireGodaddyConfig()).resolves.toEqual(cfg);
    (getRuntimeEnvValue as jest.Mock).mockResolvedValue('');
    await expect(godaddyConfig()).resolves.toBeNull();
    await expect(requireGodaddyConfig()).rejects.toMatchObject({
      message: expect.stringContaining('Tech → Environment Variables → GoDaddy'),
      extensions: { code: 'BAD_REQUEST' },
    });
  });
});

describe('calls', () => {
  it('signs with the sso-key header and addresses the domain, sending no body on a read', async () => {
    answer(200, { domain: 'duncit.com', status: 'ACTIVE' });
    await expect(godaddyDomain(cfg)).resolves.toMatchObject({ status: 'ACTIVE' });
    const [label, url, init] = lastCall();
    expect(label).toBe('GoDaddy');
    expect(url).toBe('https://api.godaddy.com/v1/domains/duncit.com');
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual({ authorization: 'sso-key key:secret', accept: 'application/json' });
    expect(init.body).toBeUndefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('points the domain at other nameservers with a JSON PATCH', async () => {
    answer(204, null);
    await godaddySetNameServers(cfg, ['a.ns.cloudflare.com', 'b.ns.cloudflare.com']);
    const [, url, init] = lastCall();
    expect(url).toBe('https://api.godaddy.com/v1/domains/duncit.com');
    expect(init.method).toBe('PATCH');
    expect(init.headers['content-type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ nameServers: ['a.ns.cloudflare.com', 'b.ns.cloudflare.com'] });
  });

  it('reads the zone’s records, treating an empty body as none', async () => {
    answer(200, [{ type: 'A', name: 'www', data: '1.2.3.4', ttl: 600 }]);
    await expect(godaddyRecords(cfg)).resolves.toEqual([{ type: 'A', name: 'www', data: '1.2.3.4', ttl: 600 }]);
    expect(lastCall()[1]).toBe('https://api.godaddy.com/v1/domains/duncit.com/records');
    answer(200, null);
    await expect(godaddyRecords(cfg)).resolves.toEqual([]);
  });

  it('addresses a (type, name) set with both parts encoded, and reads it back as empty when GoDaddy has none', async () => {
    answer(200, [{ data: '1.2.3.4', ttl: 600 }]);
    await expect(godaddyRecordSet(cfg, 'TXT', '_dmarc')).resolves.toEqual([{ data: '1.2.3.4', ttl: 600 }]);
    expect(lastCall()[1]).toBe('https://api.godaddy.com/v1/domains/duncit.com/records/TXT/_dmarc');
    answer(200, null);
    await expect(godaddyRecordSet(cfg, 'A', '@')).resolves.toEqual([]);
    expect(lastCall()[1]).toBe('https://api.godaddy.com/v1/domains/duncit.com/records/A/%40');
  });

  it('adds records beside what is there, replaces a set, and deletes a set', async () => {
    answer(200, null);
    await godaddyAddRecords(cfg, [{ type: 'A', name: 'new', data: '1.1.1.1', ttl: 600 }]);
    expect(lastCall()[2].method).toBe('PATCH');
    expect(lastCall()[1]).toMatch(/\/records$/);
    expect(JSON.parse(lastCall()[2].body as string)).toEqual([{ type: 'A', name: 'new', data: '1.1.1.1', ttl: 600 }]);
    answer(200, null);
    await godaddyReplaceSet(cfg, 'A', 'www', [{ data: '2.2.2.2', ttl: 600 }]);
    expect(lastCall()[2].method).toBe('PUT');
    expect(lastCall()[1]).toMatch(/\/records\/A\/www$/);
    answer(204, null);
    await godaddyDeleteSet(cfg, 'A', 'www');
    expect(lastCall()[2].method).toBe('DELETE');
    expect(lastCall()[2].body).toBeUndefined();
  });
});

describe('refusals', () => {
  it.each([
    [401, 'GoDaddy refused the API key and secret.', 'BAD_GATEWAY'],
    [403, 'GoDaddy did not let this key manage duncit.com.', 'BAD_GATEWAY'],
    [404, 'GoDaddy has no duncit.com in this account.', 'BAD_GATEWAY'],
    [422, 'GoDaddy refused the record.', 'BAD_USER_INPUT'],
    [429, 'GoDaddy is rate-limiting this key.', 'BAD_GATEWAY'],
    [500, 'GoDaddy answered HTTP 500.', 'BAD_GATEWAY'],
  ])('explains HTTP %i in words an operator can act on', async (status, text, code) => {
    answer(status, {});
    await expect(godaddyDomain(cfg)).rejects.toMatchObject({
      message: expect.stringContaining(text),
      extensions: { code, godaddy_status: status },
    });
  });

  it('adds GoDaddy’s own message and its field complaints', async () => {
    answer(422, {
      message: 'Invalid record', fields: [{ path: 'records[0].ttl', message: 'must be >= 600' }, { message: 'only a message' }, { path: 'only-a-path' }, {}],
    });
    await expect(godaddyReplaceSet(cfg, 'A', 'www', [])).rejects.toMatchObject({
      message: 'GoDaddy refused the record. GoDaddy said: Invalid record · records[0].ttl: must be >= 600 · only a message · only-a-path',
    });
  });

  it('adds just the field complaints when GoDaddy gives no message', async () => {
    answer(422, { fields: [{ path: 'p', message: 'm' }] });
    await expect(godaddyReplaceSet(cfg, 'A', 'www', [])).rejects.toMatchObject({ message: 'GoDaddy refused the record. GoDaddy said: p: m' });
  });

  it('refuses with the plain explanation when the error body is not JSON or empty', async () => {
    answer(502, new Error('<html>'));
    await expect(godaddyDomain(cfg)).rejects.toMatchObject({ message: 'GoDaddy answered HTTP 502.' });
    answer(503, null);
    await expect(godaddyDomain(cfg)).rejects.toMatchObject({ message: 'GoDaddy answered HTTP 503.' });
  });
});
