import { envEntryService, testEnvConnection } from '../../envEntry.service';
import { envEntryResolvers } from '../../envEntry.resolver';
import { envEntryTypeDefs } from '../../envEntry.schema';
import { CATEGORY_FIELDS } from '../../envEntry.fields';
import { ENV_CATEGORIES } from '../../envEntry.model';
import { makeContext } from '@test/harness';

const sdl = (envEntryTypeDefs as any).loc?.source?.body ?? String(envEntryTypeDefs);

describe('envEntry unit', () => {
  it('create rejects an unsupported category', async () => {
    await expect(
      envEntryService.create({ name: 'X', category: 'TELEPATHY' as any })
    ).rejects.toThrow(/unsupported environment category/i);
  });

  it('every category has at least one field defined', () => {
    for (const category of ENV_CATEGORIES) {
      expect(CATEGORY_FIELDS[category].length).toBeGreaterThan(0);
    }
  });

  it('SDL enum EnvCategory exactly matches code ENV_CATEGORIES (no drift)', () => {
    const block = sdl.match(/enum EnvCategory\s*\{([^}]*)\}/);
    expect(block).toBeTruthy();
    const sdlValues = block![1].split(/\s+/).filter(Boolean).sort();
    expect(sdlValues).toEqual([...ENV_CATEGORIES].sort());
  });

  it('SDL exposes a per-category interactive test mutation for the categories that have one', () => {
    for (const mutation of ['testEnvEmail', 'testEnvImagekitUpload', 'testEnvPexels', 'testEnvTwilioCall', 'testEnvOpenai', 'testEnvGemini']) {
      expect(sdl).toContain(mutation);
    }
    // Vobiz was removed — its category, test mutation and field map are gone.
    expect(sdl).not.toContain('VOBIZ');
    expect(sdl).not.toContain('testEnvVobizCall');
    // The removed provider enum must be gone.
    expect(sdl).not.toContain('AiTestProvider');
  });

  it('gates all mutations + queries to tech-manage roles', async () => {
    const user = makeContext({ roles: ['USER'] });
    await expect((envEntryResolvers.Query as any).envEntries({}, { filter: {} }, user)).rejects.toThrow(/access denied/i);
    await expect((envEntryResolvers.Query as any).envCategories({}, {}, user)).rejects.toThrow(/access denied/i);
    await expect((envEntryResolvers.Mutation as any).createEnvEntry({}, { input: {} }, user)).rejects.toThrow(/access denied/i);
    await expect((envEntryResolvers.Mutation as any).setPortalEnvEntries({}, { portalKey: 'crm', entryIds: [] }, user)).rejects.toThrow(/access denied/i);
  });

  describe('testEnvConnection', () => {
    const okFetch = (body: any = {}) => jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
    const badFetch = (status = 401) => jest.fn().mockResolvedValue({ ok: false, status, json: async () => ({}) });
    afterEach(() => { delete (global as any).fetch; });

    it.each(['IMAGEKIT', 'PEXELS', 'TWILIO', 'OPENAI', 'GEMINI'] as const)('requires credentials for %s', async (c) => {
      const res = await testEnvConnection(c, {});
      expect(res.ok).toBe(false);
    });

    it('EMAIL validates host presence without a network call', async () => {
      expect((await testEnvConnection('EMAIL', {})).ok).toBe(false);
      expect((await testEnvConnection('EMAIL', { host: 'smtp.test' })).ok).toBe(true);
    });

    it('GOOGLE_OAUTH passes on a client_id without a network call', async () => {
      expect((await testEnvConnection('GOOGLE_OAUTH', {})).ok).toBe(false);
      expect((await testEnvConnection('GOOGLE_OAUTH', { client_id: 'cid' })).ok).toBe(true);
    });

    it('passes IMAGEKIT/PEXELS/TWILIO/OPENAI/GEMINI/VOBIZ on a 200', async () => {
      (global as any).fetch = okFetch();
      expect((await testEnvConnection('IMAGEKIT', { private_key: 'k' })).ok).toBe(true);
      expect((await testEnvConnection('PEXELS', { api_key: 'k' })).ok).toBe(true);
      expect((await testEnvConnection('TWILIO', { account_sid: 's', auth_token: 't' })).ok).toBe(true);
      expect((await testEnvConnection('OPENAI', { api_key: 'k', base_url: 'https://x/v1/' })).ok).toBe(true);
      expect((await testEnvConnection('GEMINI', { api_key: 'k' })).ok).toBe(true);
    });

    it('fails on a non-200 and on Google Maps REQUEST_DENIED', async () => {
      (global as any).fetch = badFetch(403);
      expect((await testEnvConnection('IMAGEKIT', { private_key: 'k' })).ok).toBe(false);
      (global as any).fetch = okFetch({ status: 'REQUEST_DENIED', error_message: 'bad' });
      expect((await testEnvConnection('GOOGLE_MAPS', { maps_api_key: 'k' })).ok).toBe(false);
      (global as any).fetch = okFetch({ status: 'OK' });
      expect((await testEnvConnection('GOOGLE_MAPS', { maps_api_key: 'k' })).ok).toBe(true);
    });

    it('reports a network failure as not-ok', async () => {
      (global as any).fetch = jest.fn().mockRejectedValue(new Error('boom'));
      const res = await testEnvConnection('PEXELS', { api_key: 'k' });
      expect(res.ok).toBe(false);
      expect(res.message).toMatch(/boom/);
    });
  });
});
