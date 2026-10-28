import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiteUserDoc } from '../../models/user.model';
import { emailService } from '../../services/email.service';
import { DEFAULT_TEMPLATES } from '../../services/email.templates';
import { notifications } from '../../services/notifications';
import { eventInput, makeUser } from '../helpers/fixtures';
import { codeOf, liteGraphql } from '../helpers/graphql';
import { withTestDatabase } from '../helpers/mongo';

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return { ...actual, env: { ...actual.env, siteUrl: 'https://lite.duncit.test', adminEmails: [] } };
});

withTestDatabase();

const run = liteGraphql();

let host: LiteUserDoc;
let guest: LiteUserDoc;
let admin: LiteUserDoc;

beforeEach(async () => {
  host = await makeUser({ email: 'hema@lite.test', name: 'Hema Host', handle: 'hema' });
  guest = await makeUser({ email: 'gita@lite.test', name: 'Gita Guest', handle: 'gita' });
  admin = await makeUser({ email: 'ada@lite.test', name: 'Ada Admin', handle: 'ada', is_admin: true });
  vi.spyOn(notifications, 'guestStatus').mockImplementation(() => undefined);
  vi.spyOn(notifications, 'hostNewRegistration').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

interface CreatedEvent {
  liteCreateEvent: { id: string; slug: string; status: string; tickets: { id: string }[] };
}

async function publishedEvent(overrides: Parameters<typeof eventInput>[0] = {}) {
  const created = await run<CreatedEvent>(
    'mutation Create($input: LiteEventInput!) { liteCreateEvent(input: $input) { id slug status tickets { id } } }',
    { input: eventInput(overrides) },
    host,
  );
  const event = created.data?.liteCreateEvent;
  if (!event) throw new Error(`event not created: ${JSON.stringify(created.errors)}`);
  const published = await run('mutation Publish($id: ID!) { litePublishEvent(id: $id) { status } }', { id: event.id }, host);
  expect(published.data).toEqual({ litePublishEvent: { status: 'PUBLISHED' } });
  return event;
}

const REGISTER = 'mutation Register($event_id: ID!, $input: LiteRegisterInput!) { liteRegister(event_id: $event_id, input: $input) { id code status qr_data_url event { title } } }';

interface Registered {
  liteRegister: { id: string; code: string; status: string; qr_data_url: string | null; event: { title: string } };
}

describe('public queries', () => {
  it('answer an anonymous visitor the settings, date format and empty lists', async () => {
    const result = await run(
      '{ _lite liteSettings { site_name phone_sign_in default_country_code } liteMe { id } publicAppSettings { date_format time_format time_zone time_source min_signup_age } liteCategories { id } liteCities { id } }',
    );
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      _lite: true,
      liteSettings: { site_name: 'Duncit Lite', phone_sign_in: false, default_country_code: '91' },
      liteMe: null,
      publicAppSettings: { date_format: 'dd MMM yyyy', time_format: 'hh:mm a', time_zone: 'Asia/Kolkata', time_source: 'SERVER', min_signup_age: 0 },
      liteCategories: [],
      liteCities: [],
    });
  });

  it('draw a UPI payment QR for any visitor', async () => {
    const result = await run<{ liteUpiQr: { upi_link: string; data_url: string } }>('{ liteUpiQr(upi_id: "hema@okaxis", name: "Hema", amount: 499) { upi_link data_url } }');
    expect(result.data?.liteUpiQr.upi_link).toBe('upi://pay?pa=hema%40okaxis&cu=INR&pn=Hema&am=499');
    expect(result.data?.liteUpiQr.data_url.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('refuse signed-in-only queries to an anonymous visitor', async () => {
    for (const query of ['{ liteMyRegistrations { id } }', '{ liteUploadTicket { upload_url } }', '{ liteMyCalendars { id } }']) {
      const result = await run(query);
      expect(codeOf(result)).toBe('UNAUTHENTICATED');
    }
  });

  it('give a signed-in person their profile and where to upload pictures', async () => {
    const result = await run('{ liteMe { email handle } liteUploadTicket { upload_url max_mb } }', {}, guest);
    expect(result.data).toEqual({ liteMe: { email: 'gita@lite.test', handle: 'gita' }, liteUploadTicket: { upload_url: 'https://lite.duncit.test/upload', max_mb: 10 } });
  });
});

describe('an event from creation to the door', () => {
  it('lets a host publish, a guest register with a QR ticket, and the door check it in', async () => {
    const event = await publishedEvent();

    const registered = await run<Registered>(REGISTER, { event_id: event.id, input: { ticket_id: event.tickets[0].id } }, guest);
    const ticket = registered.data?.liteRegister;
    expect(ticket).toMatchObject({ status: 'CONFIRMED', event: { title: 'Sunday Jazz at Bandra' } });
    expect(ticket?.qr_data_url?.startsWith('data:image/png;base64,')).toBe(true);

    const attending = await run('{ liteMyEvents(scope: ATTENDING) { slug viewer_registration { code } } }', {}, guest);
    expect(attending.data).toEqual({ liteMyEvents: [{ slug: event.slug, viewer_registration: { code: ticket?.code } }] });
    const hosting = await run('{ liteMyEvents(scope: HOSTING) { slug viewer_is_host } }', {}, host);
    expect(hosting.data).toEqual({ liteMyEvents: [{ slug: event.slug, viewer_is_host: true }] });

    const guestList = await run('query List($id: ID!) { liteEventRegistrations(event_id: $id) { code user { email } } }', { id: event.id }, host);
    expect(guestList.data).toEqual({ liteEventRegistrations: [{ code: ticket?.code, user: { email: 'gita@lite.test' } }] });

    const checkedIn = await run<{ liteHostCheckInByCode: { checked_in_at: string | null } }>(
      'mutation Door($id: ID!, $code: String!) { liteHostCheckInByCode(event_id: $id, code: $code) { checked_in_at } }',
      { id: event.id, code: ticket?.code },
      host,
    );
    expect(checkedIn.data?.liteHostCheckInByCode.checked_in_at).toEqual(expect.any(String));

    const mine = await run('query Mine($id: ID!) { liteRegistration(id: $id) { checked_in_at } }', { id: ticket?.id }, guest);
    expect(mine.data).toEqual({ liteRegistration: { checked_in_at: checkedIn.data?.liteHostCheckInByCode.checked_in_at } });

    const page = await run('query Page($slug: String!) { liteEvent(slug: $slug) { title viewer_is_host stats { going } } }', { slug: event.slug });
    expect(page.data).toEqual({ liteEvent: { title: 'Sunday Jazz at Bandra', viewer_is_host: false, stats: { going: 1 } } });
  });

  it('draws no QR for a ticket that does not admit anyone yet', async () => {
    const event = await publishedEvent({ require_approval: true });
    const registered = await run<Registered>(REGISTER, { event_id: event.id, input: { ticket_id: event.tickets[0].id } }, guest);
    expect(registered.data?.liteRegister).toMatchObject({ status: 'PENDING_APPROVAL', qr_data_url: null });
  });

  it("refuses the guest list to someone who is not the event's host", async () => {
    const event = await publishedEvent();
    const result = await run('query List($id: ID!) { liteEventRegistrations(event_id: $id) { code } }', { id: event.id }, guest);
    expect(codeOf(result)).toBe('FORBIDDEN');
  });
});

describe('admin operations', () => {
  const ID = '"507f1f77bcf86cd799439011"';
  const operations = [
    '{ liteAdminStats { users } }',
    '{ liteAdminSettings { site_name } }',
    '{ liteAdminEventsTable { total } }',
    '{ liteAdminUsersTable { total } }',
    '{ liteAdminRegistrationsTable { total } }',
    '{ liteAdminCalendarsTable { total } }',
    '{ liteEnvEntries { id } }',
    '{ liteEnvCategories { category } }',
    '{ liteEmailTemplates { key } }',
    '{ liteEmailLogsTable { total } }',
    '{ liteLocales { code } }',
    '{ liteTranslationsTable(locale: "en-IN") { total } }',
    'mutation { liteAdminUpdateSettings(input: { site_name: "Mine" }) { site_name } }',
    `mutation { liteAdminSetEventFlags(id: ${ID}, featured: true) { id } }`,
    `mutation { liteAdminCancelEvent(id: ${ID}) { id } }`,
    `mutation { liteAdminSetUserFlags(id: ${ID}, is_admin: true) { id } }`,
    `mutation { liteAdminSetCalendarFeatured(id: ${ID}, featured: true) { id } }`,
    'mutation { liteUpsertCategory(input: { name: "Music" }) { id } }',
    `mutation { liteDeleteCategory(id: ${ID}) }`,
    'mutation { liteUpsertCity(input: { name: "Mumbai" }) { id } }',
    `mutation { liteDeleteCity(id: ${ID}) }`,
    'mutation { liteCreateEnvEntry(input: { name: "Mailbox", category: EMAIL }) { id } }',
    `mutation { liteUpdateEnvEntry(id: ${ID}, input: { name: "Mailbox", category: EMAIL }) { id } }`,
    `mutation { liteDeleteEnvEntry(id: ${ID}) }`,
    `mutation { liteSetDefaultEnvEntry(id: ${ID}) { id } }`,
    `mutation { liteTestEnvEntry(id: ${ID}) { ok } }`,
    'mutation { liteUpdateEmailTemplate(key: "sign_in_code", input: { subject: "s", body: "b", enabled: true }) { key } }',
    'mutation { liteSendTestEmail(template_key: "sign_in_code", to: "x@lite.test") { ok } }',
    'mutation { liteUpsertLocale(input: { code: "hi", label: "Hindi", english_label: "Hindi" }) { code } }',
    'mutation { liteDeleteLocale(code: "hi") }',
    'mutation { liteSetTranslations(locale: "hi", entries: []) }',
    `mutation { liteDeleteTranslation(id: ${ID}) }`,
    'mutation { liteImportTranslationKeys(entries: []) { created } }',
  ];

  it.each(operations)('refuses a member who is not an admin: %s', async (operation) => {
    const result = await run(operation, {}, guest);
    expect(result.errors?.[0]).toMatchObject({ message: 'Only a Lite admin can do this', extensions: expect.objectContaining({ code: 'FORBIDDEN' }) });
  });

  it('answers the dashboard numbers to an admin', async () => {
    const result = await run('{ liteAdminStats { users events } liteEnvCategories { category } }', {}, admin);
    expect(result.data).toEqual({ liteAdminStats: { users: 3, events: 0 }, liteEnvCategories: expect.arrayContaining([{ category: 'MSG91' }, { category: 'GOOGLE_MAPS' }]) });
  });

  it('will not let an admin remove their own access, but lets them change others', async () => {
    const demote = await run('mutation Flags($id: ID!) { liteAdminSetUserFlags(id: $id, is_admin: false) { id } }', { id: String(admin._id) }, admin);
    expect(demote.errors?.[0]).toMatchObject({ message: 'You cannot remove your own access' });
    const block = await run('mutation Flags($id: ID!) { liteAdminSetUserFlags(id: $id, is_blocked: true) { id } }', { id: String(admin._id) }, admin);
    expect(codeOf(block)).toBe('BAD_USER_INPUT');

    const other = await run('mutation Flags($id: ID!) { liteAdminSetUserFlags(id: $id, is_blocked: true) { is_blocked } }', { id: String(guest._id) }, admin);
    expect(other.data).toEqual({ liteAdminSetUserFlags: { is_blocked: true } });
  });

  it('edits an email template and refuses an unknown one or a blank subject', async () => {
    await emailService.seedTemplates();
    const list = await run<{ liteEmailTemplates: { key: string; name: string }[] }>('{ liteEmailTemplates { key name } }', {}, admin);
    const names = list.data?.liteEmailTemplates.map((t) => t.name) ?? [];
    expect(names).toHaveLength(DEFAULT_TEMPLATES.length);
    // MongoDB sorts names by code point, which is what the default sort does too.
    expect(names).toEqual([...names].sort());

    const UPDATE = 'mutation Update($key: String!, $input: LiteEmailTemplateInput!) { liteUpdateEmailTemplate(key: $key, input: $input) { key subject enabled } }';
    const edited = await run(UPDATE, { key: 'sign_in_code', input: { subject: ' Your code: {code} ', body: 'Code {code}', enabled: false } }, admin);
    expect(edited.data).toEqual({ liteUpdateEmailTemplate: { key: 'sign_in_code', subject: 'Your code: {code}', enabled: false } });
    expect(codeOf(await run(UPDATE, { key: 'nope', input: { subject: 's', body: 'b', enabled: true } }, admin))).toBe('NOT_FOUND');
    expect(codeOf(await run(UPDATE, { key: 'sign_in_code', input: { subject: ' ', body: 'b', enabled: true } }, admin))).toBe('BAD_USER_INPUT');
  });

  it("sends a test of a template to the admin's own mailbox with its placeholders shown", async () => {
    await emailService.seedTemplates();
    const send = vi.spyOn(emailService, 'send').mockResolvedValue({ status: 'SENT', message: 'Sent to ada@lite.test' });
    const result = await run('mutation { liteSendTestEmail(template_key: "registration_confirmed", to: "") { ok message } }', {}, admin);
    expect(result.data).toEqual({ liteSendTestEmail: { ok: true, message: 'Sent to ada@lite.test' } });
    expect(send.mock.calls[0][0]).toMatchObject({
      to: 'ada@lite.test',
      templateKey: 'registration_confirmed',
      vars: { event_title: '{event_title}', ticket_url: '{ticket_url}', name: 'Ada Admin', code: '123456', minutes: 10 },
    });
    expect(codeOf(await run('mutation { liteSendTestEmail(template_key: "nope", to: "") { ok } }', {}, admin))).toBe('NOT_FOUND');
  });

  it('creates and tests an environment entry with the admin as the fallback recipient', async () => {
    const created = await run<{ liteCreateEnvEntry: { id: string; is_default: boolean } }>(
      'mutation { liteCreateEnvEntry(input: { name: "Google", category: GOOGLE_OAUTH, config: [{ key: "client_id", value: "lite.apps.googleusercontent.com" }] }) { id is_default } }',
      {},
      admin,
    );
    expect(created.data?.liteCreateEnvEntry.is_default).toBe(true);
    const tested = await run('mutation Test($id: ID!) { liteTestEnvEntry(id: $id) { ok message } }', { id: created.data?.liteCreateEnvEntry.id }, admin);
    expect(tested.data).toEqual({ liteTestEnvEntry: { ok: true, message: 'Client id has the expected shape' } });
  });

  it('saves settings through the console, refusing out-of-range limits', async () => {
    const refused = await run('mutation { liteAdminUpdateSettings(input: { max_event_capacity: 0 }) { max_event_capacity } }', {}, admin);
    expect(refused.errors?.[0]).toMatchObject({ message: 'Largest event capacity must be at least 1' });
    const saved = await run('mutation { liteAdminUpdateSettings(input: { max_event_capacity: 250 }) { max_event_capacity } }', {}, admin);
    expect(saved.data).toEqual({ liteAdminUpdateSettings: { max_event_capacity: 250 } });
  });
});
