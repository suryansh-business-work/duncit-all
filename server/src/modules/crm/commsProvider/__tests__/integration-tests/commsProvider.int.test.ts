import { commsProviderService } from '../../commsProvider.service';
import { CommsProviderModel } from '../../commsProvider.model';

describe('commsProviderService integration', () => {
  it('creates an SMTP provider and reads it back without exposing secrets', async () => {
    const created = await commsProviderService.create({
      name: 'Primary SMTP',
      type: 'SMTP',
      is_default: true,
      config: { host: 'smtp.test', port: 587, user: 'u', password: 'secret' },
    });
    expect(created!.type).toBe('SMTP');
    expect((created!.config as any).host).toBe('smtp.test');
    expect((created!.config as any).has_password).toBe(true);
    expect((created!.config as any).password).toBeUndefined();

    expect((await commsProviderService.get(created!.id))?.name).toBe('Primary SMTP');
    expect(await commsProviderService.list({ type: 'SMTP' })).toHaveLength(1);
  });

  it('keeps a single default per type', async () => {
    const a = await commsProviderService.create({ name: 'A', type: 'SMTP', is_default: true, config: {} });
    const b = await commsProviderService.create({ name: 'B', type: 'SMTP', is_default: false, config: {} });

    await commsProviderService.setDefault(b!.id);
    const refreshedA = await commsProviderService.get(a!.id);
    const refreshedB = await commsProviderService.get(b!.id);
    expect(refreshedA?.is_default).toBe(false);
    expect(refreshedB?.is_default).toBe(true);
  });

  it('updates and removes a provider', async () => {
    const p = await commsProviderService.create({ name: 'Temp', type: 'VOBIZ_EMAIL', config: {} });
    const updated = await commsProviderService.update(p!.id, { description: 'updated' });
    expect(updated!.description).toBe('updated');

    expect(await commsProviderService.remove(p!.id)).toBeDefined();
    expect(await CommsProviderModel.countDocuments({ name: 'Temp' })).toBe(0);
  });
});
