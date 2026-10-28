import { describe, expect, it } from 'vitest';
import { makeSettingsSchema, settingsValuesFrom, TIME_ZONES, toSettingsInput, type SettingsFormValues } from '../../../../pages/settings/settings';
import { makeSettings } from '../../../fixtures';
import { portalT } from '../../../test-utils';

const schema = makeSettingsSchema(portalT);
const VALID: SettingsFormValues = settingsValuesFrom(makeSettings());

/** The first message the schema gives `field` once it holds `value`, or undefined when it is accepted. */
const messageFor = <K extends keyof SettingsFormValues>(field: K, value: SettingsFormValues[K]): string | undefined =>
  schema.safeParse({ ...VALID, [field]: value }).error?.issues.find((issue) => issue.path[0] === field)?.message;

describe('settingsValuesFrom / toSettingsInput', () => {
  it('turns lists and numbers into editable text, including the capacity, seat and phone settings', () => {
    expect(VALID).toMatchObject({
      reminder_hours_before: '24, 1',
      admin_emails: 'owner@lite.example, ops@lite.example',
      max_ticket_price: '50000',
      max_event_capacity: '5000',
      max_seats_per_registration: '10',
      sign_in_with_phone: false,
    });
  });

  it('round-trips every setting unchanged', () => {
    const settings = makeSettings({ sign_in_with_phone: true, max_event_capacity: 1_000_000, max_seats_per_registration: 100, max_ticket_price: 0 });
    expect(toSettingsInput(settingsValuesFrom(settings))).toEqual(settings);
  });

  it('parses the comma lists leniently: blanks dropped, emails lowercased', () => {
    const input = toSettingsInput({ ...VALID, reminder_hours_before: ' 48 ,, 2 ,', admin_emails: 'Owner@Lite.Example ,  ops@lite.example,' });
    expect(input.reminder_hours_before).toEqual([48, 2]);
    expect(input.admin_emails).toEqual(['owner@lite.example', 'ops@lite.example']);
  });

  it('sends empty lists when the boxes are empty', () => {
    const input = toSettingsInput({ ...VALID, reminder_hours_before: '', admin_emails: '' });
    expect(input.reminder_hours_before).toEqual([]);
    expect(input.admin_emails).toEqual([]);
  });
});

describe('TIME_ZONES', () => {
  it('lists the IANA zones the browser knows', () => {
    expect(TIME_ZONES).toContain('America/New_York');
    expect(TIME_ZONES).toContain('Europe/London');
  });
});

describe('makeSettingsSchema', () => {
  it('accepts the stored settings and normalises case on currency and email', () => {
    const parsed = schema.parse({ ...VALID, currency: 'usd', support_email: ' Help@Lite.Example ', site_name: '  Lite  ' });
    expect(parsed.currency).toBe('USD');
    expect(parsed.support_email).toBe('help@lite.example');
    expect(parsed.site_name).toBe('Lite');
  });

  it('requires a site name of at most 80 characters', () => {
    expect(messageFor('site_name', '   ')).toBe('Site name is required');
    expect(messageFor('site_name', 'x'.repeat(80))).toBeUndefined();
    expect(messageFor('site_name', 'x'.repeat(81))).toBe('Site name must be 80 characters or fewer');
  });

  it('requires a valid support email', () => {
    expect(messageFor('support_email', '')).toBe('Support email is required');
    expect(messageFor('support_email', 'help@lite')).toBe('Enter a valid email address');
  });

  it('only takes a time zone from the list', () => {
    expect(messageFor('default_timezone', 'America/New_York')).toBeUndefined();
    expect(messageFor('default_timezone', 'Mars/Olympus')).toBe('Pick a time zone from the list');
    expect(messageFor('default_timezone', '')).toBe('Pick a time zone from the list');
  });

  it('takes the API default Asia/Kolkata and UTC, which V8 knows but does not list', () => {
    expect(messageFor('default_timezone', 'Asia/Kolkata')).toBeUndefined();
    expect(messageFor('default_timezone', 'UTC')).toBeUndefined();
  });

  it('requires date and time patterns of at most 40 characters', () => {
    expect(messageFor('date_format', '')).toBe('Date format is required');
    expect(messageFor('date_format', 'd'.repeat(41))).toBe('Date format must be 40 characters or fewer');
    expect(messageFor('time_format', ' ')).toBe('Time format is required');
    expect(messageFor('time_format', 'h'.repeat(41))).toBe('Time format must be 40 characters or fewer');
  });

  it('takes a three-letter currency code only', () => {
    for (const bad of ['RUPEE', 'IN', 'I1R', '']) {
      expect(messageFor('currency', bad), bad).toBe('ISO code, for example INR');
    }
  });

  it('takes a blank or an http(s) URL for both Duncit addresses', () => {
    expect(messageFor('duncit_graphql_url', '')).toBeUndefined();
    expect(messageFor('duncit_graphql_url', 'http://localhost:4000/graphql')).toBeUndefined();
    expect(messageFor('duncit_graphql_url', 'ftp://api.example.com')).toBe('Duncit GraphQL URL must be a valid URL');
    expect(messageFor('duncit_graphql_url', 'not a url')).toBe('Duncit GraphQL URL must be a valid URL');
    expect(messageFor('duncit_app_url', 'javascript:alert(1)')).toBe('Duncit app URL must be a valid URL');
    expect(messageFor('duncit_app_url', 'https://app.example.com')).toBeUndefined();
  });

  it('takes reminder hours as a comma list of whole hours, each 1 to 720', () => {
    for (const good of ['', '24', '24, 1', '24,1', '1, 720', ' 48 , 2 ']) {
      expect(messageFor('reminder_hours_before', good), good).toBeUndefined();
    }
    for (const bad of ['0', '721', '24, 0', '24;1', '24,', ',24', '1.5', '-1', 'soon']) {
      expect(messageFor('reminder_hours_before', bad), bad).toBe('Use whole hours separated by commas, for example 24, 1');
    }
  });

  it('caps the UPI help text at 500 characters', () => {
    expect(messageFor('upi_help_text', 'u'.repeat(500))).toBeUndefined();
    expect(messageFor('upi_help_text', 'u'.repeat(501))).toBe('UPI help text must be 500 characters or fewer');
  });

  it('needs every admin email to be valid, allowing an empty list', () => {
    expect(messageFor('admin_emails', '')).toBeUndefined();
    expect(messageFor('admin_emails', 'a@x.com, b@y.org,')).toBeUndefined();
    expect(messageFor('admin_emails', 'a@x.com, nope')).toBe('Every entry must be a valid email address');
  });

  it('bounds the ticket price ceiling to 0..10,000,000 whole rupees', () => {
    expect(messageFor('max_ticket_price', '0')).toBeUndefined();
    expect(messageFor('max_ticket_price', '10000000')).toBeUndefined();
    expect(messageFor('max_ticket_price', '10000001')).toBe('Maximum ticket price must be 10000000 or less');
    expect(messageFor('max_ticket_price', '-1')).toBe('Maximum ticket price cannot be negative');
    expect(messageFor('max_ticket_price', '99.5')).toBe('Maximum ticket price must be a whole number');
    expect(messageFor('max_ticket_price', '')).toBe('Maximum ticket price must be a whole number');
  });

  it('bounds the event capacity to 1..1,000,000', () => {
    expect(messageFor('max_event_capacity', '1')).toBeUndefined();
    expect(messageFor('max_event_capacity', '1000000')).toBeUndefined();
    expect(messageFor('max_event_capacity', '0')).toBe('Largest event capacity must be 1 or more');
    expect(messageFor('max_event_capacity', '1000001')).toBe('Largest event capacity must be 1000000 or less');
    expect(messageFor('max_event_capacity', '-50')).toBe('Largest event capacity cannot be negative');
  });

  it('bounds the seats per registration to 1..100', () => {
    expect(messageFor('max_seats_per_registration', '1')).toBeUndefined();
    expect(messageFor('max_seats_per_registration', '100')).toBeUndefined();
    expect(messageFor('max_seats_per_registration', '0')).toBe('Seats per registration must be 1 or more');
    expect(messageFor('max_seats_per_registration', '101')).toBe('Seats per registration must be 100 or less');
    expect(messageFor('max_seats_per_registration', '-2')).toBe('Seats per registration cannot be negative');
  });

  it('reports each invalid field on its own path', () => {
    const result = schema.safeParse({ ...VALID, site_name: '', max_seats_per_registration: '0', currency: 'X' });
    const paths = result.error?.issues.map((issue) => issue.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['site_name', 'max_seats_per_registration', 'currency']));
  });
});
