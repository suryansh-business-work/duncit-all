/**
 * envEntryService paths the basic CRUD suite does not reach: listing filters,
 * every field of an update, promotion when the default is deleted, import
 * rules, portal assignment, runtime resolution with a missing or inactive
 * entry, and every upstream probe's answer. fetch is the only thing stubbed.
 */
import { envEntryService, testEnvConnection } from '../../envEntry.service';
import { EnvEntryModel } from '../../envEntry.model';
import { EnvTestLogModel } from '../../envTestLog.model';

const fetchMock = jest.fn();
beforeEach(() => {
  global.fetch = fetchMock as never;
});

const mail = (name: string, over: Record<string, unknown> = {}) =>
  envEntryService.create({ name, category: 'EMAIL', config: { host: 'smtp.test', password: 'secret' }, ...over } as never);

describe('list', () => {
  it('filters by category and by whether the entry is active', async () => {
    await mail('A');
    await mail('B', { is_active: false });
    await envEntryService.create({ name: 'P', category: 'PEXELS', config: { api_key: 'k' } });
    expect((await envEntryService.list({})).map((e) => e.name)).toEqual(['A', 'B', 'P']);
    expect((await envEntryService.list({ category: 'EMAIL' })).map((e) => e.name)).toEqual(['A', 'B']);
    expect((await envEntryService.list({ category: 'EMAIL', is_active: false })).map((e) => e.name)).toEqual(['B']);
    expect((await envEntryService.list({ is_active: true })).map((e) => e.name)).toEqual(['A', 'P']);
    expect(await envEntryService.list({ category: null, is_active: null })).toHaveLength(3);
  });

  it('shows an entry whose stored config is null as having no values, without failing', async () => {
    await EnvEntryModel.collection.insertOne({ name: 'Legacy', category: 'EMAIL', config: null, is_default: false, is_active: true, assigned_portals: [], description: '' });
    const [row] = await envEntryService.list({});
    expect(row.config.every((c) => c.value === '')).toBe(true);
    expect(row.secrets).toEqual([{ key: 'has_password', present: false }]);
  });
});

describe('get', () => {
  it('returns one entry, or null for an unknown id', async () => {
    const entry = await mail('A');
    await expect(envEntryService.get(entry.id)).resolves.toMatchObject({ name: 'A' });
    await expect(envEntryService.get('64b0000000000000000000ff')).resolves.toBeNull();
  });
});

describe('create', () => {
  it('accepts an entry with no config at all', async () => {
    const created = await envEntryService.create({ name: 'Bare', category: 'PEXELS' });
    expect(created.config.every((c) => c.value === '')).toBe(true);
  });

  it('refuses a category the platform does not know', async () => {
    await expect(envEntryService.create({ name: 'X', category: 'TELEPATHY' as never })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('makes the first entry of a category the default, and a later explicit default replaces it', async () => {
    const first = await mail('First');
    expect(first.is_default).toBe(true);
    const second = await mail('Second');
    expect(second.is_default).toBe(false);
    const third = await mail('Third', { is_default: true });
    expect(third.is_default).toBe(true);
    const defaults = (await envEntryService.list({ category: 'EMAIL' })).filter((e) => e.is_default).map((e) => e.name);
    expect(defaults).toEqual(['Third']);
  });

  it('trims the name, keeps the description and portals, and skips blank secrets and unset values', async () => {
    const created = await envEntryService.create({
      name: '  Spaced  ', category: 'EMAIL', description: 'Main', assigned_portals: ['tech'], config: { host: 'h', password: '', port: undefined as never },
    });
    expect(created).toMatchObject({ name: 'Spaced', description: 'Main', assigned_portals: ['tech'] });
    expect(created.secrets).toEqual([{ key: 'has_password', present: false }]);
    expect(created.config.find((c) => c.key === 'port')?.value).toBe('');
  });
});

describe('update', () => {
  it('changes every field that was sent, trimming the name, and merges config without blanking a secret', async () => {
    const entry = await mail('Old');
    const updated = await envEntryService.update(entry.id, {
      name: ' New ', description: 'Desc', is_default: true, is_active: false, assigned_portals: ['crm'], config: { host: 'new.test', password: '' },
    });
    expect(updated).toMatchObject({ name: 'New', description: 'Desc', is_default: true, is_active: false, assigned_portals: ['crm'] });
    const raw = await EnvEntryModel.findById(entry.id).lean();
    expect(raw?.config).toMatchObject({ host: 'new.test', password: 'secret' });
  });

  it('leaves everything alone that was not sent', async () => {
    const entry = await mail('Same', { description: 'keep' });
    const updated = await envEntryService.update(entry.id, {});
    expect(updated).toMatchObject({ name: 'Same', description: 'keep', is_active: true });
    await envEntryService.update(entry.id, { name: null, description: null, is_default: null, is_active: null, config: null, assigned_portals: null });
    expect((await EnvEntryModel.findById(entry.id).lean())?.name).toBe('Same');
  });

  it('updates an entry whose stored config is null', async () => {
    const { insertedId } = await EnvEntryModel.collection.insertOne({ name: 'Legacy', category: 'EMAIL', config: null, is_default: false, is_active: true, assigned_portals: [], description: '' });
    await envEntryService.update(String(insertedId), { config: { host: 'now.test' } });
    expect((await EnvEntryModel.findById(insertedId).lean())?.config).toEqual({ host: 'now.test' });
  });

  it('is NOT_FOUND for an unknown entry', async () => {
    await expect(envEntryService.update('64b0000000000000000000ff', {})).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});

describe('remove and setDefault', () => {
  it('promotes the next active entry (by name) when the default goes, and not an inactive one', async () => {
    const a = await mail('A');
    await mail('B', { is_active: false });
    await mail('C');
    await expect(envEntryService.remove(a.id)).resolves.toBe(true);
    const defaults = (await envEntryService.list({ category: 'EMAIL' })).filter((e) => e.is_default).map((e) => e.name);
    expect(defaults).toEqual(['C']);
  });

  it('leaves the others alone when a non-default entry goes, and when nothing is left to promote', async () => {
    const a = await mail('A');
    const b = await mail('B');
    await envEntryService.remove(b.id);
    expect((await envEntryService.list({})).map((e) => [e.name, e.is_default])).toEqual([['A', true]]);
    await envEntryService.remove(a.id);
    expect(await envEntryService.list({})).toEqual([]);
  });

  it('is NOT_FOUND removing or defaulting an unknown entry', async () => {
    await expect(envEntryService.remove('64b0000000000000000000ff')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(envEntryService.setDefault('64b0000000000000000000ff')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });

  it('makes one entry the only default of its category', async () => {
    await mail('A');
    const b = await mail('B');
    await envEntryService.setDefault(b.id);
    expect((await envEntryService.list({ category: 'EMAIL' })).filter((e) => e.is_default).map((e) => e.name)).toEqual(['B']);
  });
});

describe('test', () => {
  it('probes the entry, records the outcome in its history and returns the answer', async () => {
    const entry = await mail('A');
    await expect(envEntryService.test(entry.id, 'u1')).resolves.toEqual({ ok: true, message: 'SMTP host smtp.test looks configured' });
    expect(await EnvTestLogModel.countDocuments({ kind: 'QUICK' })).toBe(1);
  });

  it('is NOT_FOUND for an unknown entry', async () => {
    await expect(envEntryService.test('64b0000000000000000000ff')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });

  it('probes an entry with a null config as empty', async () => {
    const { insertedId } = await EnvEntryModel.collection.insertOne({ name: 'L', category: 'EMAIL', config: null, is_default: false, is_active: true, assigned_portals: [], description: '' });
    await expect(envEntryService.test(String(insertedId))).resolves.toEqual({ ok: false, message: 'SMTP host is required' });
  });
});

describe('importEntries', () => {
  it('creates new entries, updates existing ones by category and name, and skips what cannot be read', async () => {
    await mail('Existing');
    const out = await envEntryService.importEntries([
      { name: 'Fresh', category: 'EMAIL', config: { host: 'fresh.test' } },
      { name: ' Existing ', category: 'EMAIL', config: { host: 'changed.test', password: '' } },
      { name: '   ', category: 'EMAIL', config: {} },
      { name: 'Odd', category: 'TELEPATHY' as never, config: {} },
      { name: '', category: 'EMAIL', config: {} },
    ]);
    expect(out).toEqual({
      created: ['EMAIL · Fresh'], updated: ['EMAIL · Existing'], skipped: ['    (EMAIL)', 'Odd (TELEPATHY)', '(unnamed) (EMAIL)'],
    });
    expect((await EnvEntryModel.findOne({ name: 'Existing' }).lean())?.config).toMatchObject({ host: 'changed.test', password: 'secret' });
  });
});

describe('portals', () => {
  it('replaces the set of entries assigned to a portal, adding and removing', async () => {
    const a = await mail('A');
    const b = await mail('B');
    const c = await mail('C');
    await envEntryService.setPortalAssignments('crm', [a.id, b.id]);
    expect((await envEntryService.listForPortal('crm')).map((e) => e.name)).toEqual(['A', 'B']);
    const after = await envEntryService.setPortalAssignments(' crm ', [c.id, c.id]);
    expect(after.map((e) => e.name)).toEqual(['C']);
    expect(await envEntryService.listForPortal(' crm ')).toHaveLength(1);
    expect(await envEntryService.setPortalAssignments('crm', [])).toEqual([]);
  });

  it('refuses a blank portal key', async () => {
    await expect(envEntryService.setPortalAssignments('  ', [])).rejects.toMatchObject({ message: 'Portal key is required', extensions: { code: 'BAD_USER_INPUT' } });
  });
});

describe('runtime resolution', () => {
  it('returns the entry asked for when it is active, else the category default, else nothing', async () => {
    const a = await mail('A', { config: { host: 'a.test' } });
    const b = await mail('B', { config: { host: 'b.test' }, is_active: false });
    await expect(envEntryService.resolveRuntime('EMAIL', a.id)).resolves.toMatchObject({ name: 'A', config: { host: 'a.test' } });
    await expect(envEntryService.resolveRuntime('EMAIL', b.id)).resolves.toMatchObject({ name: 'A' });
    await expect(envEntryService.resolveRuntime('EMAIL', '64b0000000000000000000ff')).resolves.toMatchObject({ name: 'A' });
    await expect(envEntryService.resolveRuntime('PEXELS')).resolves.toBeNull();
  });

  it('reads the entry asked for by id with a null config as empty', async () => {
    const { insertedId } = await EnvEntryModel.collection.insertOne({ name: 'L', category: 'PEXELS', config: null, is_default: false, is_active: true, assigned_portals: [], description: '' });
    await expect(envEntryService.resolveRuntime('PEXELS', String(insertedId))).resolves.toMatchObject({ name: 'L', config: {} });
  });

  it('reads an entry with a null config as empty', async () => {
    await EnvEntryModel.collection.insertOne({ name: 'L', category: 'PEXELS', config: null, is_default: true, is_active: true, assigned_portals: ['tech'], description: '' });
    await expect(envEntryService.resolveRuntime('PEXELS')).resolves.toMatchObject({ name: 'L', config: {} });
    await expect(envEntryService.resolveForPortal('tech', 'PEXELS')).resolves.toMatchObject({ name: 'L', config: {} });
  });

  it('prefers the entry assigned to the portal, then the default, and respects active', async () => {
    const def = await mail('Default', { config: { host: 'def.test' } });
    const mine = await mail('Mine', { config: { host: 'mine.test' }, assigned_portals: ['crm'] });
    await expect(envEntryService.resolveForPortal(' crm ', 'EMAIL')).resolves.toMatchObject({ id: mine.id });
    await envEntryService.update(mine.id, { is_active: false });
    await expect(envEntryService.resolveForPortal('crm', 'EMAIL')).resolves.toMatchObject({ id: def.id });
    await expect(envEntryService.resolveForPortal('crm', 'PEXELS')).resolves.toBeNull();
  });
});

describe('testEnvConnection: upstream probes', () => {
  const answer = (status: number, body: unknown = {}) =>
    fetchMock.mockResolvedValue({ ok: status < 400, status, json: async () => body });

  it('ImageKit', async () => {
    await expect(testEnvConnection('IMAGEKIT', {})).resolves.toEqual({ ok: false, message: 'Private key is required' });
    answer(200);
    await expect(testEnvConnection('IMAGEKIT', { private_key: 'k' })).resolves.toEqual({ ok: true, message: 'ImageKit credentials are valid' });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(`Basic ${Buffer.from('k:').toString('base64')}`);
    answer(401);
    await expect(testEnvConnection('IMAGEKIT', { private_key: 'k' })).resolves.toEqual({ ok: false, message: 'ImageKit rejected the key (HTTP 401)' });
  });

  it('Pexels', async () => {
    answer(403);
    await expect(testEnvConnection('PEXELS', { api_key: 'k' })).resolves.toEqual({ ok: false, message: 'Pexels rejected the key (HTTP 403)' });
  });

  it('Google Maps: required, denied with or without Google’s reason, and valid', async () => {
    await expect(testEnvConnection('GOOGLE_MAPS', {})).resolves.toEqual({ ok: false, message: 'Maps API key is required' });
    answer(200, { status: 'REQUEST_DENIED', error_message: 'The key is invalid' });
    await expect(testEnvConnection('GOOGLE_MAPS', { maps_api_key: 'k' })).resolves.toEqual({ ok: false, message: 'The key is invalid' });
    answer(200, { status: 'REQUEST_DENIED' });
    await expect(testEnvConnection('GOOGLE_MAPS', { maps_api_key: 'k' })).resolves.toEqual({ ok: false, message: 'Google denied the request' });
    answer(200, { status: 'OK' });
    await expect(testEnvConnection('GOOGLE_MAPS', { maps_api_key: 'k' })).resolves.toEqual({ ok: true, message: 'Google Maps API key is valid' });
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error('not json'); } });
    await expect(testEnvConnection('GOOGLE_MAPS', { maps_api_key: 'k' })).resolves.toMatchObject({ ok: true });
  });

  it('Google OAuth: only checks the client id is set', async () => {
    await expect(testEnvConnection('GOOGLE_OAUTH', {})).resolves.toEqual({ ok: false, message: 'OAuth Client ID is required' });
    await expect(testEnvConnection('GOOGLE_OAUTH', { client_id: 'c' })).resolves.toMatchObject({ ok: true });
  });

  it('Twilio', async () => {
    await expect(testEnvConnection('TWILIO', { account_sid: 's' })).resolves.toEqual({ ok: false, message: 'Account SID and auth token are required' });
    answer(200);
    await expect(testEnvConnection('TWILIO', { account_sid: 's', auth_token: 't' })).resolves.toEqual({ ok: true, message: 'Twilio credentials are valid' });
    answer(401);
    await expect(testEnvConnection('TWILIO', { account_sid: 's', auth_token: 't' })).resolves.toEqual({ ok: false, message: 'Twilio rejected the credentials (HTTP 401)' });
  });

  it('OpenAI: default and custom base url, and a rejected key', async () => {
    answer(200);
    await testEnvConnection('OPENAI', { api_key: 'k' });
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.openai.com/v1/models');
    await expect(testEnvConnection('OPENAI', { api_key: 'k', base_url: 'https://proxy/v1/' })).resolves.toEqual({ ok: true, message: 'OpenAI key is valid' });
    expect(fetchMock.mock.calls[1][0]).toBe('https://proxy/v1/models');
    answer(401);
    await expect(testEnvConnection('OPENAI', { api_key: 'k' })).resolves.toEqual({ ok: false, message: 'OpenAI rejected the key (HTTP 401)' });
  });

  it('Gemini', async () => {
    answer(400);
    await expect(testEnvConnection('GEMINI', { api_key: 'k' })).resolves.toEqual({ ok: false, message: 'Gemini rejected the key (HTTP 400)' });
    answer(200);
    await expect(testEnvConnection('GEMINI', { api_key: 'k' })).resolves.toEqual({ ok: true, message: 'Gemini key is valid' });
  });

  it('Sarvam: required, rejected on 401 or 403, accepted otherwise, default and custom base url', async () => {
    await expect(testEnvConnection('SERVAM', {})).resolves.toEqual({ ok: false, message: 'API key is required' });
    answer(401);
    await expect(testEnvConnection('SERVAM', { api_key: 'k' })).resolves.toEqual({ ok: false, message: 'Servam rejected the key (HTTP 401)' });
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.sarvam.ai/v1/models');
    answer(403);
    await expect(testEnvConnection('SERVAM', { api_key: 'k' })).resolves.toMatchObject({ ok: false });
    answer(404);
    await expect(testEnvConnection('SERVAM', { api_key: 'k', base_url: 'https://sarvam.test/' })).resolves.toEqual({ ok: true, message: 'Servam API key is set' });
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('https://sarvam.test/v1/models');
  });

  it('answers a thrown error as a failed connection, with the message or the value', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    await expect(testEnvConnection('PEXELS', { api_key: 'k' })).resolves.toEqual({ ok: false, message: 'Connection failed: network down' });
    fetchMock.mockRejectedValueOnce('plain');
    await expect(testEnvConnection('PEXELS', { api_key: 'k' })).resolves.toEqual({ ok: false, message: 'Connection failed: plain' });
    fetchMock.mockRejectedValueOnce({});
    await expect(testEnvConnection('PEXELS', { api_key: 'k' })).resolves.toMatchObject({ ok: false });
  });

  it('AiSensy is probed without a destination, so it can never spend a real message', async () => {
    const out = await testEnvConnection('AISENSY', {});
    expect(out.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('EMAIL needs a host, and reads numeric and boolean config as text', async () => {
    await expect(testEnvConnection('EMAIL', { host: null as never })).resolves.toEqual({ ok: false, message: 'SMTP host is required' });
    await expect(testEnvConnection('EMAIL', { host: 25 })).resolves.toEqual({ ok: true, message: 'SMTP host 25 looks configured' });
  });
});
