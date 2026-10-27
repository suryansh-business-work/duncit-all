import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiteCalendarModel } from '../../models/calendar.model';
import { LiteEmailLogModel } from '../../models/emailLog.model';
import type { LiteUserDoc } from '../../models/user.model';
import { notifications } from '../../services/notifications';
import { hostedEvent, makeUser, seedRegistration } from '../helpers/fixtures';
import { codeOf, liteGraphql } from '../helpers/graphql';
import { withTestDatabase } from '../helpers/mongo';

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return { ...actual, env: { ...actual.env, siteUrl: 'https://lite.duncit.test', adminEmails: ['ada@lite.test'] } };
});

withTestDatabase();

const run = liteGraphql();

let admin: LiteUserDoc;
let host: LiteUserDoc;

beforeEach(async () => {
  admin = await makeUser({ email: 'ada@lite.test', name: 'Ada Admin', handle: 'ada', is_admin: true });
  host = await makeUser({ email: 'hema@lite.test', name: 'Hema Host', handle: 'hema' });
  vi.spyOn(notifications, 'calendarPublished').mockImplementation(() => undefined);
  vi.spyOn(notifications, 'eventCancelled').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('console tables', () => {
  it('pages users, events, registrations, calendars and email logs', async () => {
    const event = await hostedEvent(host);
    await seedRegistration(event, await makeUser({ email: 'gita@lite.test', name: 'Gita' }), { code: 'GITA22' });
    await LiteCalendarModel.create({ owner_id: host._id, slug: 'hema-live', name: 'Hema Live' });
    await LiteEmailLogModel.create({ to: 'gita@lite.test', subject: 'You are in', status: 'SENT' });

    const result = await run(
      `{
        liteAdminUsersTable(query: { search: "hema" }) { total rows { email } }
        liteAdminEventsTable(query: { page_size: 5 }) { total page_size rows { title } }
        liteAdminRegistrationsTable { total rows { code user { email } } }
        liteAdminCalendarsTable { total rows { slug } }
        liteEmailLogsTable(query: { filters: [{ field: "status", op: eq, value: "SENT" }] }) { total rows { to } }
      }`,
      {},
      admin,
    );

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      liteAdminUsersTable: { total: 1, rows: [{ email: 'hema@lite.test' }] },
      liteAdminEventsTable: { total: 1, page_size: 5, rows: [{ title: 'Sunday Jazz at Bandra' }] },
      liteAdminRegistrationsTable: { total: 1, rows: [{ code: 'GITA22', user: { email: 'gita@lite.test' } }] },
      liteAdminCalendarsTable: { total: 1, rows: [{ slug: 'hema-live' }] },
      liteEmailLogsTable: { total: 1, rows: [{ to: 'gita@lite.test' }] },
    });
  });

  it('shows the settings with the deploy admins', async () => {
    const result = await run('{ liteAdminSettings { site_name admin_emails max_event_capacity } }', {}, admin);
    expect(result.data).toEqual({ liteAdminSettings: { site_name: 'Duncit Lite', admin_emails: ['ada@lite.test'], max_event_capacity: 10_000 } });
  });
});

describe('moderation', () => {
  it('features, hides and cancels an event, and features a calendar', async () => {
    const event = await hostedEvent(host);
    const id = String(event._id);
    const flagged = await run('mutation F($id: ID!) { liteAdminSetEventFlags(id: $id, featured: true, hidden: true) { featured hidden } }', { id }, admin);
    expect(flagged.data).toEqual({ liteAdminSetEventFlags: { featured: true, hidden: true } });

    const cancelled = await run('mutation C($id: ID!) { liteAdminCancelEvent(id: $id, reason: "Breaks the rules") { status cancel_reason } }', { id }, admin);
    expect(cancelled.data).toEqual({ liteAdminCancelEvent: { status: 'CANCELLED', cancel_reason: 'Breaks the rules' } });

    const calendar = await LiteCalendarModel.create({ owner_id: host._id, slug: 'hema-live', name: 'Hema Live' });
    const featured = await run('mutation F($id: ID!) { liteAdminSetCalendarFeatured(id: $id, featured: true) { featured } }', { id: String(calendar._id) }, admin);
    expect(featured.data).toEqual({ liteAdminSetCalendarFeatured: { featured: true } });
  });
});

describe('categories and cities', () => {
  it('creates and deletes a category and a city', async () => {
    const category = await run<{ liteUpsertCategory: { id: string; slug: string } }>('mutation { liteUpsertCategory(input: { name: "Live Music", icon: "MusicNote" }) { id slug } }', {}, admin);
    expect(category.data?.liteUpsertCategory.slug).toBe('live-music');
    const city = await run<{ liteUpsertCity: { id: string; region: string } }>('mutation { liteUpsertCity(input: { name: "London", region: EUROPE }) { id region } }', {}, admin);
    expect(city.data?.liteUpsertCity.region).toBe('EUROPE');

    expect((await run('mutation D($id: ID!) { liteDeleteCategory(id: $id) }', { id: category.data?.liteUpsertCategory.id }, admin)).data).toEqual({ liteDeleteCategory: true });
    expect((await run('mutation D($id: ID!) { liteDeleteCity(id: $id) }', { id: city.data?.liteUpsertCity.id }, admin)).data).toEqual({ liteDeleteCity: true });
  });
});

describe('environment entries', () => {
  it('creates, renames, lists, re-defaults and deletes an entry', async () => {
    const CREATE = 'mutation C($input: LiteEnvEntryInput!) { liteCreateEnvEntry(input: $input) { id is_default } }';
    const first = await run<{ liteCreateEnvEntry: { id: string; is_default: boolean } }>(CREATE, { input: { name: 'Primary', category: 'EMAIL', config: [{ key: 'host', value: 'smtp.duncit.com' }] } }, admin);
    const second = await run<{ liteCreateEnvEntry: { id: string; is_default: boolean } }>(CREATE, { input: { name: 'Backup', category: 'EMAIL' } }, admin);
    expect(first.data?.liteCreateEnvEntry.is_default).toBe(true);
    expect(second.data?.liteCreateEnvEntry.is_default).toBe(false);
    const secondId = second.data?.liteCreateEnvEntry.id;

    const renamed = await run('mutation U($id: ID!) { liteUpdateEnvEntry(id: $id, input: { name: "Backup (SES)", category: EMAIL }) { name } }', { id: secondId }, admin);
    expect(renamed.data).toEqual({ liteUpdateEnvEntry: { name: 'Backup (SES)' } });

    const defaulted = await run('mutation S($id: ID!) { liteSetDefaultEnvEntry(id: $id) { is_default } }', { id: secondId }, admin);
    expect(defaulted.data).toEqual({ liteSetDefaultEnvEntry: { is_default: true } });
    expect((await run('{ liteEnvEntries(category: EMAIL) { name is_default } }', {}, admin)).data).toEqual({
      liteEnvEntries: [
        { name: 'Backup (SES)', is_default: true },
        { name: 'Primary', is_default: false },
      ],
    });

    expect((await run('mutation D($id: ID!) { liteDeleteEnvEntry(id: $id) }', { id: secondId }, admin)).data).toEqual({ liteDeleteEnvEntry: true });
    expect(codeOf(await run('mutation S($id: ID!) { liteSetDefaultEnvEntry(id: $id) { id } }', { id: secondId }, admin))).toBe('NOT_FOUND');
  });
});

describe('localization', () => {
  it('adds a locale, writes and reads its strings, imports keys and deletes it', async () => {
    const locale = await run('mutation { liteUpsertLocale(input: { code: "hi-IN", label: "हिन्दी", english_label: "Hindi" }) { code is_default } }', {}, admin);
    expect(locale.data).toEqual({ liteUpsertLocale: { code: 'hi-IN', is_default: false } });

    const written = await run('mutation { liteSetTranslations(locale: "hi-IN", entries: [{ key: "web.cta", value: "पंजीकरण" }, { key: "web.title", value: "खोजें" }]) }', {}, admin);
    expect(written.data).toEqual({ liteSetTranslations: 2 });

    const table = await run<{ liteTranslationsTable: { total: number; rows: { id: string; key: string }[] } }>('{ liteTranslationsTable(locale: "hi-IN") { total rows { id key } } }', {}, admin);
    expect(table.data?.liteTranslationsTable.total).toBe(2);
    const publicStrings = await run<{ publicTranslations: { key: string; value: string }[]; publicLocales: { code: string }[] }>(
      '{ publicTranslations(locale: "hi-IN") { key value } publicLocales { code } }',
    );
    expect(publicStrings.data?.publicLocales).toEqual([{ code: 'hi-IN' }]);
    expect(publicStrings.data?.publicTranslations).toHaveLength(2);
    expect(publicStrings.data?.publicTranslations).toEqual(
      expect.arrayContaining([
        { key: 'web.cta', value: 'पंजीकरण' },
        { key: 'web.title', value: 'खोजें' },
      ]),
    );

    const firstRow = table.data?.liteTranslationsTable.rows[0]?.id;
    expect((await run('mutation D($id: ID!) { liteDeleteTranslation(id: $id) }', { id: firstRow }, admin)).data).toEqual({ liteDeleteTranslation: true });

    const imported = await run('mutation { liteImportTranslationKeys(entries: [{ key: "web.cta", value: "Register" }]) { created skipped } }', {}, admin);
    expect(imported.data).toEqual({ liteImportTranslationKeys: { created: 1, skipped: 0 } });

    expect((await run('{ liteLocales { code translated_count } }', {}, admin)).data).toEqual({ liteLocales: [{ code: 'hi-IN', translated_count: 1 }] });
    expect((await run('mutation { liteDeleteLocale(code: "hi-IN") }', {}, admin)).data).toEqual({ liteDeleteLocale: true });
  });
});
