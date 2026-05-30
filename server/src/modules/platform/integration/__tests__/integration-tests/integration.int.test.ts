import { integrationService } from '../../integration.service';
import { IntegrationProviderModel } from '../../integration.model';

describe('integrationService integration', () => {
  it('creates a provider and reads it back without exposing secrets', async () => {
    const created = await integrationService.create({
      name: 'Primary ImageKit',
      type: 'IMAGEKIT',
      is_default: true,
      config: { public_key: 'pk', private_key: 'secret', url_endpoint: 'https://ik.io/x' },
    });
    expect(created!.type).toBe('IMAGEKIT');
    expect((created!.config as any).public_key).toBe('pk');
    expect((created!.config as any).has_private_key).toBe(true);
    expect((created!.config as any).private_key).toBeUndefined();

    expect((await integrationService.get(created!.id))?.name).toBe('Primary ImageKit');
    expect(await integrationService.list({ type: 'IMAGEKIT' })).toHaveLength(1);
    expect(await integrationService.options('IMAGEKIT')).toHaveLength(1);
  });

  it('keeps a single default per type', async () => {
    const a = await integrationService.create({ name: 'A', type: 'PEXELS', is_default: true, config: {} });
    const b = await integrationService.create({ name: 'B', type: 'PEXELS', is_default: false, config: {} });

    await integrationService.setDefault(b!.id);
    expect((await integrationService.get(a!.id))?.is_default).toBe(false);
    expect((await integrationService.get(b!.id))?.is_default).toBe(true);
  });

  it('does not overwrite a secret when the new value is blank', async () => {
    const created = await integrationService.create({
      name: 'Twilio', type: 'TWILIO', config: { account_sid: 'AC', auth_token: 'tok' },
    });
    const updated = await integrationService.update(created!.id, { config: { auth_token: '' } });
    expect((updated!.config as any).has_auth_token).toBe(true);
  });

  it('updates and removes a provider', async () => {
    const p = await integrationService.create({ name: 'Temp', type: 'AI', config: {} });
    const updated = await integrationService.update(p!.id, { description: 'updated' });
    expect(updated!.description).toBe('updated');
    expect(await integrationService.remove(p!.id)).toBe(true);
    expect(await IntegrationProviderModel.countDocuments({ name: 'Temp' })).toBe(0);
  });

  it('throws NOT_FOUND on missing ids', async () => {
    await expect(integrationService.update('507f1f77bcf86cd799439011', {})).rejects.toThrow(/not found/i);
    await expect(integrationService.remove('507f1f77bcf86cd799439011')).rejects.toThrow(/not found/i);
    await expect(integrationService.setDefault('507f1f77bcf86cd799439011')).rejects.toThrow(/not found/i);
    await expect(integrationService.test('507f1f77bcf86cd799439011')).rejects.toThrow(/not found/i);
  });

  it('resolveRuntime returns the default active provider', async () => {
    const created = await integrationService.create({
      name: 'AI default', type: 'AI', is_default: true, config: { api_key: 'k' },
    });
    const byId = await integrationService.resolveRuntime('AI', created!.id);
    expect(byId?.config.api_key).toBe('k');
    const byDefault = await integrationService.resolveRuntime('AI');
    expect(byDefault?.id).toBe(created!.id);
    expect(await integrationService.resolveRuntime('GOOGLE')).toBeNull();
  });

  it('test() records last_used_at on a successful probe', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const created = await integrationService.create({ name: 'P', type: 'PEXELS', config: { api_key: 'k' } });
    const result = await integrationService.test(created!.id);
    expect(result.ok).toBe(true);
    expect((await integrationService.get(created!.id))?.last_used_at).toBeTruthy();
    delete (global as any).fetch;
  });
});
