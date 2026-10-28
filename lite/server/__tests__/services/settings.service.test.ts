import { describe, expect, it, vi } from 'vitest';
import { LiteSettingsModel } from '../../models/settings.model';
import { envEntryService } from '../../services/envEntry.service';
import { SETTING_BOUNDS, settingsService, type AdminSettingsInput } from '../../services/settings.service';
import { badInputError } from '../helpers/expect';
import { withTestDatabase } from '../helpers/mongo';

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return {
    ...actual,
    env: {
      ...actual.env,
      adminEmails: ['founder@duncit.com'],
      duncitGraphqlUrl: 'https://server.duncit.test/graphql',
      duncitAppUrl: 'https://mweb.duncit.test',
    },
  };
});

withTestDatabase();

const msg91 = (pairs: Record<string, string>) =>
  envEntryService.create({ name: 'MSG91 live', category: 'MSG91', config: Object.entries(pairs).map(([key, value]) => ({ key, value })) });

describe('settingsService.seed', () => {
  it('creates the one global row and adds the deploy admins once', async () => {
    await LiteSettingsModel.deleteMany({});
    await settingsService.seed();
    await settingsService.seed();
    const rows = await LiteSettingsModel.find({}).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe('global');
    expect(rows[0].admin_emails).toEqual(['founder@duncit.com']);
  });

  it('keeps admins added from the console', async () => {
    await settingsService.update({ admin_emails: ['ops@duncit.com'] });
    await settingsService.seed();
    const row = await LiteSettingsModel.findOne({ key: 'global' }).lean();
    expect(row?.admin_emails).toEqual(['ops@duncit.com', 'founder@duncit.com']);
  });
});

describe('settingsService.get', () => {
  it('answers the defaults when no row exists yet', async () => {
    await LiteSettingsModel.deleteMany({});
    await settingsService.seed();
    await LiteSettingsModel.deleteMany({});
    const settings = await settingsService.get();
    expect(settings).toMatchObject({ site_name: 'Duncit Lite', max_event_capacity: 10_000, max_seats_per_registration: 10, sign_in_with_phone: true });
  });

  it('serves a cached copy until the console saves a change', async () => {
    expect((await settingsService.get()).site_name).toBe('Duncit Lite');
    await LiteSettingsModel.updateOne({ key: 'global' }, { $set: { site_name: 'Edited behind the cache' } });
    expect((await settingsService.get()).site_name).toBe('Duncit Lite');

    await settingsService.update({ site_name: 'Duncit Events' });
    expect((await settingsService.get()).site_name).toBe('Duncit Events');
  });
});

describe('settingsService.duncitGraphqlUrl', () => {
  it("prefers the console's URL and falls back to the deploy's", async () => {
    await expect(settingsService.duncitGraphqlUrl()).resolves.toBe('https://server.duncit.test/graphql');
    await settingsService.update({ duncit_graphql_url: 'https://staging-server.duncit.com/graphql' });
    await expect(settingsService.duncitGraphqlUrl()).resolves.toBe('https://staging-server.duncit.com/graphql');
  });
});

describe('settingsService.update', () => {
  it('saves valid values, normalised, and returns the admin view', async () => {
    const saved = await settingsService.update({
      site_name: '  Duncit Events  ',
      support_email: ' Help@Duncit.com ',
      default_timezone: 'Europe/London',
      currency: 'usd',
      admin_emails: ['Ops@Duncit.com', 'ops@duncit.com', 'ceo@duncit.com'],
      max_ticket_price: 5000,
      max_event_capacity: 2500,
      max_seats_per_registration: 4,
      sign_in_with_phone: false,
      reminders_enabled: false,
      upi_help_text: 'Pay on any UPI app.',
    });
    expect(saved).toMatchObject({
      site_name: 'Duncit Events',
      support_email: 'help@duncit.com',
      default_timezone: 'Europe/London',
      currency: 'USD',
      admin_emails: ['ops@duncit.com', 'ceo@duncit.com'],
      max_ticket_price: 5000,
      max_event_capacity: 2500,
      max_seats_per_registration: 4,
      sign_in_with_phone: false,
      reminders_enabled: false,
      upi_help_text: 'Pay on any UPI app.',
      duncit_graphql_url: 'https://server.duncit.test/graphql',
      duncit_app_url: 'https://mweb.duncit.test',
    });
  });

  it('accepts the outer bounds themselves', async () => {
    const low = await settingsService.update({ max_ticket_price: 0, max_event_capacity: 1, max_seats_per_registration: 1 });
    expect(low).toMatchObject({ max_ticket_price: 0, max_event_capacity: 1, max_seats_per_registration: 1 });
    const high = await settingsService.update({
      max_ticket_price: SETTING_BOUNDS.ticketPrice.max,
      max_event_capacity: SETTING_BOUNDS.eventCapacity.max,
      max_seats_per_registration: SETTING_BOUNDS.seatsPerRegistration.max,
    });
    expect(high).toMatchObject({ max_ticket_price: 10_000_000, max_event_capacity: 1_000_000, max_seats_per_registration: 100 });
  });

  const invalid: [AdminSettingsInput, string][] = [
    [{ max_ticket_price: -1 }, 'Highest ticket price cannot be negative'],
    [{ max_ticket_price: 10_000_001 }, 'Highest ticket price cannot be more than 10000000'],
    [{ max_ticket_price: 99.5 }, 'Highest ticket price must be a whole number'],
    [{ max_event_capacity: 0 }, 'Largest event capacity must be at least 1'],
    [{ max_event_capacity: 1_000_001 }, 'Largest event capacity cannot be more than 1000000'],
    [{ max_seats_per_registration: 0 }, 'Seats per registration must be at least 1'],
    [{ max_seats_per_registration: 101 }, 'Seats per registration cannot be more than 100'],
    [{ reminder_hours_before: [] }, 'Give at least one reminder hour between 1 and 720'],
    [{ reminder_hours_before: [24, 0] }, 'Reminder hour must be at least 1'],
    [{ reminder_hours_before: [721] }, 'Reminder hour cannot be more than 720'],
    [{ reminder_hours_before: [2.5] }, 'Reminder hour must be a whole number'],
    [{ site_name: '   ' }, 'Site name is required'],
    [{ currency: 'RUPEE' }, 'Currency must be 3 characters or fewer'],
    [{ support_email: 'help' }, 'Enter a valid email address'],
    [{ admin_emails: ['ops@duncit.com', 'not-an-email'] }, 'Enter a valid email address'],
    [{ default_timezone: 'IST' }, 'Pick a valid time zone'],
  ];

  it.each(invalid)('refuses %o', async (input, message) => {
    await expect(settingsService.update(input)).rejects.toMatchObject(badInputError(message));
  });

  it('de-duplicates reminder hours and sorts them latest first', async () => {
    const saved = await settingsService.update({ reminder_hours_before: [1, 24, 24, 72, 720] });
    expect(saved.reminder_hours_before).toEqual([720, 72, 24, 1]);
  });

  it('saves nothing when any field is invalid', async () => {
    await expect(settingsService.update({ site_name: 'Half saved', max_event_capacity: 0 })).rejects.toMatchObject(badInputError(/capacity/));
    const row = await LiteSettingsModel.findOne({ key: 'global' }).lean();
    expect(row?.site_name).toBe('Duncit Lite');
  });

  it('leaves fields that are not sent untouched', async () => {
    await settingsService.update({ max_event_capacity: 300 });
    const saved = await settingsService.update({ currency: 'eur' });
    expect(saved).toMatchObject({ max_event_capacity: 300, currency: 'EUR', site_name: 'Duncit Lite' });
  });
});

describe('settingsService.publicSettings', () => {
  it('answers safe defaults when nothing is configured', async () => {
    await expect(settingsService.publicSettings()).resolves.toEqual({
      site_name: 'Duncit Lite',
      support_email: 'support@duncit.com',
      default_timezone: 'Asia/Kolkata',
      currency: 'INR',
      google_client_id: '',
      sign_in_with_duncit: true,
      maps_api_key: '',
      maps_map_id: '',
      phone_sign_in: false,
      default_country_code: '91',
      max_ticket_price: 0,
      max_event_capacity: 10_000,
      max_seats_per_registration: 10,
      upi_help_text: expect.stringContaining('UPI'),
      duncit_app_url: 'https://mweb.duncit.test',
    });
  });

  it('offers phone sign-in only with a widget id AND an auth key, and never exposes the auth key', async () => {
    await msg91({ widget_id: 'widget-123', auth_key: 'msg91-secret-auth-key', default_country_code: '44' });
    const settings = await settingsService.publicSettings();
    expect(settings.phone_sign_in).toBe(true);
    expect(settings.default_country_code).toBe('44');
    expect(JSON.stringify(settings)).not.toContain('msg91-secret-auth-key');
    expect(JSON.stringify(settings)).not.toContain('widget-123');
  });

  it('keeps phone sign-in off when the MSG91 entry is incomplete', async () => {
    await msg91({ widget_id: 'widget-123' });
    expect((await settingsService.publicSettings()).phone_sign_in).toBe(false);
  });

  it('keeps phone sign-in off when the console switch is off, even with a carrier', async () => {
    await msg91({ widget_id: 'widget-123', auth_key: 'msg91-secret-auth-key' });
    await settingsService.update({ sign_in_with_phone: false });
    expect((await settingsService.publicSettings()).phone_sign_in).toBe(false);
  });

  it('exposes the browser Maps key, the map id and the Google client id', async () => {
    await envEntryService.create({ name: 'Maps', category: 'GOOGLE_MAPS', config: [{ key: 'api_key', value: 'AIza-browser' }, { key: 'map_id', value: 'dark-map' }] });
    await envEntryService.create({ name: 'Google', category: 'GOOGLE_OAUTH', config: [{ key: 'client_id', value: 'abc.apps.googleusercontent.com' }] });
    await settingsService.update({ duncit_app_url: 'https://mweb.duncit.com', max_ticket_price: 2000 });
    await expect(settingsService.publicSettings()).resolves.toMatchObject({
      maps_api_key: 'AIza-browser',
      maps_map_id: 'dark-map',
      google_client_id: 'abc.apps.googleusercontent.com',
      duncit_app_url: 'https://mweb.duncit.com',
      max_ticket_price: 2000,
    });
  });
});

describe('settingsService.adminSettings', () => {
  it('fills the URLs from the deploy when the console left them blank', async () => {
    await expect(settingsService.adminSettings()).resolves.toMatchObject({
      duncit_graphql_url: 'https://server.duncit.test/graphql',
      duncit_app_url: 'https://mweb.duncit.test',
      reminder_hours_before: [24, 1],
      admin_emails: ['founder@duncit.com'],
    });
  });
});
