import { commsService } from '../../comms.service';
import { envEntryService } from '@modules/platform/envEntry/envEntry.service';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';

describe('commsService integration — SMTP email + Twilio call from Tech-portal env entries', () => {
  afterEach(async () => {
    delete (global as any).fetch;
    await EnvEntryModel.deleteMany({});
  });

  it('reports not-configured when there is no EMAIL entry (no .env fallback)', async () => {
    const res = await commsService.sendEmail({ to: 'a@b.com', subject: 's', body: 'b' });
    expect(res.ok).toBe(false);
    expect(res.provider).toBe('smtp');
    expect(res.provider_id).toBeNull();
    expect(res.message).toMatch(/Environment Variables/i);
  });

  it('flags an EMAIL entry that has no SMTP host (using the entry, not .env)', async () => {
    const entry = await envEntryService.create({ name: 'Broken SMTP', category: 'EMAIL', is_default: true, config: { from_address: 'x@y.com' } });
    const res = await commsService.sendEmail({ to: 'a@b.com', subject: 's', body: 'b' });
    expect(res.ok).toBe(false);
    expect(res.provider_id).toBe(entry!.id);
    expect(res.message).toMatch(/no SMTP host/i);
  });

  it('reports not-configured when there is no TWILIO entry', async () => {
    const res = await commsService.call({ to: '+14155551234' });
    expect(res.ok).toBe(false);
    expect(res.provider).toBe('twilio');
    expect(res.message).toMatch(/Environment Variables/i);
  });

  it('places a Twilio call using the default TWILIO entry', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ sid: 'CA1' }) });
    const def = await envEntryService.create({
      name: 'Main Twilio', category: 'TWILIO', is_default: true,
      config: { account_sid: 'AC', auth_token: 't', phone_number: '+14155550000' },
    });
    const res = await commsService.call({ to: '+14155551234' });
    expect(res.ok).toBe(true);
    expect(res.provider).toBe('twilio');
    expect(res.provider_id).toBe(def!.id);
    expect(res.external_id).toBe('CA1');
    expect((global as any).fetch).toHaveBeenCalledWith(
      'https://api.twilio.com/2010-04-01/Accounts/AC/Calls.json',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('honours an explicitly selected TWILIO entry', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ sid: 'CA2' }) });
    await envEntryService.create({ name: 'Default', category: 'TWILIO', is_default: true, config: { account_sid: 'ACd', auth_token: 'd', phone_number: '+1' } });
    const chosen = await envEntryService.create({ name: 'City Line', category: 'TWILIO', config: { account_sid: 'ACc', auth_token: 'c', phone_number: '+2' } });

    const res = await commsService.call({ to: '+14155551234', provider_id: chosen!.id });
    expect(res.provider_id).toBe(chosen!.id);
    expect((global as any).fetch).toHaveBeenCalledWith(
      'https://api.twilio.com/2010-04-01/Accounts/ACc/Calls.json',
      expect.anything()
    );
  });
});
