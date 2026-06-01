import { commsProviderService } from '../../commsProvider.service';
import { CommsProviderModel } from '../../commsProvider.model';
import { envEntryService } from '@modules/platform/envEntry/envEntry.service';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';

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
    const p = await commsProviderService.create({ name: 'Temp', type: 'TWILIO_CALL', config: {} });
    const updated = await commsProviderService.update(p!.id, { description: 'updated' });
    expect(updated!.description).toBe('updated');

    expect(await commsProviderService.remove(p!.id)).toBeDefined();
    expect(await CommsProviderModel.countDocuments({ name: 'Temp' })).toBe(0);
  });

  describe('options() now source from Tech-portal env entries', () => {
    afterEach(async () => {
      await EnvEntryModel.deleteMany({});
    });

    it('TWILIO_CALL lists active TWILIO env entries (default first)', async () => {
      await envEntryService.create({ name: 'Primary Twilio', category: 'TWILIO', is_default: true, config: { account_sid: 'AC', auth_token: 't', phone_number: '+1' } });
      await envEntryService.create({ name: 'Backup Twilio', category: 'TWILIO', config: { account_sid: 'AC2', auth_token: 't2', phone_number: '+2' } });

      const calls = await commsProviderService.options('TWILIO_CALL');
      expect(calls.map((o) => o.name)).toEqual(['Primary Twilio', 'Backup Twilio']);
      expect(calls[0].is_default).toBe(true);
      expect(calls[0].type).toBe('TWILIO_CALL');
    });

    it('SMTP options come from EMAIL env entries', async () => {
      await envEntryService.create({ name: 'Sales SMTP', category: 'EMAIL', is_default: true, config: { host: 'smtp.test', password: 'p' } });
      const smtp = await commsProviderService.options('SMTP');
      expect(smtp.map((o) => o.name)).toEqual(['Sales SMTP']);
    });

    it('excludes inactive (disabled) entries from the picker', async () => {
      await envEntryService.create({ name: 'Active Twilio', category: 'TWILIO', is_default: true, config: { account_sid: 'AC', auth_token: 't', phone_number: '+1' } });
      const off = await envEntryService.create({ name: 'Disabled Twilio', category: 'TWILIO', config: { account_sid: 'AC2', auth_token: 't2', phone_number: '+2' } });
      await envEntryService.update(off!.id, { is_active: false });

      const calls = await commsProviderService.options('TWILIO_CALL');
      expect(calls.map((o) => o.name)).toEqual(['Active Twilio']);
      expect(calls.every((o) => o.is_active)).toBe(true);
    });
  });
});
