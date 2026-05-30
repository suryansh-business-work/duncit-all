import { integrationService, testIntegrationConnection } from '../../integration.service';
import { integrationResolvers } from '../../integration.resolver';
import { makeContext } from '@test/harness';

describe('integration unit', () => {
  it('create rejects an unsupported integration type', async () => {
    await expect(
      integrationService.create({ name: 'X', type: 'TELEPATHY' as any, config: {} })
    ).rejects.toThrow(/unsupported integration type/i);
  });

  it('createIntegrationProvider is gated to tech-manage roles', async () => {
    await expect(
      (integrationResolvers.Mutation as any).createIntegrationProvider({}, { input: {} }, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });

  it('integrationProviders query is gated to tech-manage roles', async () => {
    await expect(
      (integrationResolvers.Query as any).integrationProviders({}, { filter: {} }, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });

  describe('testIntegrationConnection', () => {
    const okFetch = (body: any = {}) =>
      jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
    const badFetch = (status = 401, body: any = {}) =>
      jest.fn().mockResolvedValue({ ok: false, status, json: async () => body });

    afterEach(() => {
      delete (global as any).fetch;
    });

    it.each(['IMAGEKIT', 'PEXELS', 'TWILIO', 'AI'] as const)('requires credentials for %s', async (type) => {
      const res = await testIntegrationConnection(type, {});
      expect(res.ok).toBe(false);
      expect(res.message).toMatch(/required/i);
    });

    it('GOOGLE requires a maps key', async () => {
      const res = await testIntegrationConnection('GOOGLE', {});
      expect(res.ok).toBe(false);
    });

    it('passes ImageKit when the API accepts the key', async () => {
      (global as any).fetch = okFetch();
      const res = await testIntegrationConnection('IMAGEKIT', { private_key: 'k' });
      expect(res.ok).toBe(true);
    });

    it('fails ImageKit on a non-200 response', async () => {
      (global as any).fetch = badFetch(403);
      const res = await testIntegrationConnection('IMAGEKIT', { private_key: 'k' });
      expect(res.ok).toBe(false);
      expect(res.message).toMatch(/403/);
    });

    it('passes Pexels and Twilio and AI on 200', async () => {
      (global as any).fetch = okFetch();
      expect((await testIntegrationConnection('PEXELS', { api_key: 'k' })).ok).toBe(true);
      expect((await testIntegrationConnection('TWILIO', { account_sid: 's', auth_token: 't' })).ok).toBe(true);
      expect((await testIntegrationConnection('AI', { api_key: 'k', base_url: 'https://x/v1/' })).ok).toBe(true);
    });

    it('treats Google REQUEST_DENIED as invalid and OK status as valid', async () => {
      (global as any).fetch = okFetch({ status: 'REQUEST_DENIED', error_message: 'bad' });
      expect((await testIntegrationConnection('GOOGLE', { maps_api_key: 'k' })).ok).toBe(false);
      (global as any).fetch = okFetch({ status: 'OK' });
      expect((await testIntegrationConnection('GOOGLE', { maps_api_key: 'k' })).ok).toBe(true);
    });

    it('reports a network failure as not-ok', async () => {
      (global as any).fetch = jest.fn().mockRejectedValue(new Error('boom'));
      const res = await testIntegrationConnection('PEXELS', { api_key: 'k' });
      expect(res.ok).toBe(false);
      expect(res.message).toMatch(/boom/);
    });
  });
});
