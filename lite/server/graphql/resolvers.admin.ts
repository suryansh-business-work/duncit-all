import { requireAdmin, type LiteContext } from '../context';
import { LiteEmailTemplateModel } from '../models/emailTemplate.model';
import { adminService } from '../services/admin.service';
import { calendarService } from '../services/calendar.service';
import { emailService, smtpFromConfig } from '../services/email.service';
import { envEntryService, readString, type EnvConfig } from '../services/envEntry.service';
import { eventService } from '../services/event.service';
import { localizationService } from '../services/localization.service';
import { settingsService } from '../services/settings.service';
import { probeImagekit } from '../services/upload.service';
import { badInput, notFound } from '../utils/errors';
import { iso } from '../utils/ids';
import { cleanText, normalizeEmail } from '../utils/validate';

type Args = Record<string, any>;

const toTemplate = (d: any) => ({
  id: String(d._id),
  key: d.key,
  name: d.name,
  description: d.description ?? '',
  subject: d.subject,
  body: d.body,
  enabled: d.enabled !== false,
  vars: d.vars ?? [],
  sent_count: d.sent_count ?? 0,
  updated_at: iso(d.updated_at) ?? '',
});

/** Prove one entry against its vendor; EMAIL sends a real message. */
async function testEntry(id: string, to: string | null | undefined, adminEmail: string) {
  const entry = await envEntryService.byId(id);
  const config = (entry.config ?? {}) as EnvConfig;
  let result: { ok: boolean; message: string };
  if (entry.category === 'EMAIL') {
    const smtp = smtpFromConfig(config);
    if (!smtp) result = { ok: false, message: 'SMTP host is required' };
    else {
      const settings = await settingsService.get();
      const outcome = await emailService.sendRaw(normalizeEmail(to || adminEmail), `${settings.site_name} test email`, 'This is a test email from the Lite console. If you can read it, the mailbox works.', settings.site_name, smtp);
      result = { ok: outcome.status === 'SENT', message: outcome.message };
    }
  } else if (entry.category === 'IMAGEKIT') {
    result = await probeImagekit(readString(config, 'private_key'));
  } else {
    const clientId = readString(config, 'client_id');
    result = clientId.endsWith('.apps.googleusercontent.com') ? { ok: true, message: 'Client id has the expected shape' } : { ok: false, message: 'A Google OAuth client id ends with .apps.googleusercontent.com' };
  }
  await envEntryService.recordTest(id, result.ok);
  return result;
}

export const adminResolvers = {
  Query: {
    publicLocales: () => localizationService.publicLocales(),
    publicTranslations: (_p: unknown, args: Args) => localizationService.publicTranslations(args.locale),
    publicAppSettings: async () => {
      const settings = await settingsService.get();
      return {
        date_format: settings.date_format,
        time_format: settings.time_format,
        time_zone: settings.default_timezone,
        time_source: 'SERVER',
        custom_time: null,
        custom_time_set_at: null,
        server_time: new Date().toISOString(),
        min_signup_age: 0,
        draft_retention_days: 0,
        ticket_discount_max_pct: 0,
      };
    },
    liteAdminStats: async (_p: unknown, _a: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return adminService.stats();
    },
    liteAdminSettings: async (_p: unknown, _a: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return settingsService.adminSettings();
    },
    liteAdminEventsTable: async (_p: unknown, args: Args, ctx: LiteContext) => adminService.eventsTable(await requireAdmin(ctx), args.query),
    liteAdminUsersTable: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return adminService.usersTable(args.query);
    },
    liteAdminRegistrationsTable: async (_p: unknown, args: Args, ctx: LiteContext) => adminService.registrationsTable(await requireAdmin(ctx), args.query),
    liteAdminCalendarsTable: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return adminService.calendarsTable(args.query);
    },
    liteEnvEntries: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return envEntryService.list(args.category);
    },
    liteEnvCategories: async (_p: unknown, _a: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return envEntryService.categories();
    },
    liteEmailTemplates: async (_p: unknown, _a: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      const docs = await LiteEmailTemplateModel.find({}).sort({ name: 1 }).lean();
      return docs.map(toTemplate);
    },
    liteEmailLogsTable: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return adminService.emailLogsTable(args.query);
    },
    liteLocales: async (_p: unknown, _a: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return localizationService.locales();
    },
    liteTranslationsTable: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return localizationService.translationsTable(args.locale, args.query);
    },
  },
  Mutation: {
    liteAdminUpdateSettings: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return settingsService.update(args.input);
    },
    liteAdminSetEventFlags: async (_p: unknown, args: Args, ctx: LiteContext) => adminService.setEventFlags(await requireAdmin(ctx), args.id, args.featured, args.hidden),
    liteAdminCancelEvent: async (_p: unknown, args: Args, ctx: LiteContext) => eventService.cancel(await requireAdmin(ctx), args.id, args.reason, true),
    liteAdminSetUserFlags: async (_p: unknown, args: Args, ctx: LiteContext) => {
      const admin = await requireAdmin(ctx);
      if (String(admin._id) === args.id && (args.is_admin === false || args.is_blocked === true)) throw badInput('You cannot remove your own access');
      return adminService.setUserFlags(args.id, args.is_admin, args.is_blocked);
    },
    liteAdminSetCalendarFeatured: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return calendarService.setFeatured(args.id, args.featured);
    },
    liteUpsertCategory: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return adminService.upsertCategory(args.id, args.input);
    },
    liteDeleteCategory: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return adminService.deleteCategory(args.id);
    },
    liteUpsertCity: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return adminService.upsertCity(args.id, args.input);
    },
    liteDeleteCity: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return adminService.deleteCity(args.id);
    },
    liteCreateEnvEntry: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return envEntryService.create(args.input);
    },
    liteUpdateEnvEntry: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return envEntryService.update(args.id, args.input);
    },
    liteDeleteEnvEntry: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return envEntryService.remove(args.id);
    },
    liteSetDefaultEnvEntry: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return envEntryService.setDefault(args.id);
    },
    liteTestEnvEntry: async (_p: unknown, args: Args, ctx: LiteContext) => {
      const admin = await requireAdmin(ctx);
      return testEntry(args.id, args.to, admin.email);
    },
    liteUpdateEmailTemplate: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      const doc = await LiteEmailTemplateModel.findOneAndUpdate(
        { key: args.key },
        { $set: { subject: cleanText(args.input.subject, 200, 'Subject', true), body: cleanText(args.input.body, 10_000, 'Body', true), enabled: Boolean(args.input.enabled) } },
        { new: true },
      ).lean();
      if (!doc) throw notFound('Template');
      return toTemplate(doc);
    },
    liteSendTestEmail: async (_p: unknown, args: Args, ctx: LiteContext) => {
      const admin = await requireAdmin(ctx);
      const template = await LiteEmailTemplateModel.findOne({ key: args.template_key }).lean();
      if (!template) throw notFound('Template');
      const vars = Object.fromEntries(template.vars.map((v) => [v, `{${v}}`]));
      const outcome = await emailService.send({ to: normalizeEmail(args.to || admin.email), templateKey: template.key, vars: { ...vars, name: admin.name, code: '123456', minutes: 10 } });
      return { ok: outcome.status === 'SENT', message: outcome.message };
    },
    liteUpsertLocale: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return localizationService.upsertLocale(args.input);
    },
    liteDeleteLocale: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return localizationService.deleteLocale(args.code);
    },
    liteSetTranslations: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return localizationService.setTranslations(args.locale, args.entries);
    },
    liteDeleteTranslation: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return localizationService.deleteTranslation(args.id);
    },
    liteImportTranslationKeys: async (_p: unknown, args: Args, ctx: LiteContext) => {
      await requireAdmin(ctx);
      return localizationService.importKeys(args.entries);
    },
  },
};
