import { envEntryService, type EnvEntryConfig } from './envEntry.service';
import { envEntryTests, type Msg91TestInput } from './envEntry.tests';
import { envAttemptService, type EnvAttemptLimitInput } from './envAttempt.service';
import {
  CATEGORY_API_DOCS,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_DOCS,
  CATEGORY_FIELDS,
  groupOf,
  CATEGORY_LABELS,
} from './envEntry.fields';
import { envAccessService } from './envAccess.service';
import { envTestLogService } from './envTestLog.service';
import { ENV_CATEGORIES, type EnvCategory } from './envEntry.model';
import type { GraphQLContext } from '@context';
import { GraphQLError } from 'graphql';
import { hasRole, LOGS_READER, requireRole } from '@middleware/rbac';

const TECH_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

/**
 * The MSG91 keys are the one category another console manages. The
 * Communications console owns the OTP channel, so its MSG91 Settings page
 * reads and edits MSG91 entries — and no other category: every other secret
 * stays Tech's. The Logs console mounts the same page, and only reads.
 */
const CHANNEL_CATEGORY: EnvCategory = 'MSG91';
const CHANNEL_MANAGE = ['COMMUNICATIONS_MANAGER'];
const CHANNEL_READ = [...CHANNEL_MANAGE, LOGS_READER];

/** The one category the caller is confined to — none for Tech, which reads them all. */
function scopeOf(ctx: GraphQLContext): EnvCategory | null {
  const user = requireRole(ctx, [...TECH_MANAGE, ...CHANNEL_READ]);
  return hasRole(user, TECH_MANAGE) ? null : CHANNEL_CATEGORY;
}

/**
 * Every read or write of an entry also needs THIS session to have typed the
 * root admin's emailed code (`envAccess.service.ts`). Checked here, server
 * side, so hiding the page in the portal is not what protects the keys.
 */
async function readScope(ctx: GraphQLContext): Promise<EnvCategory | null> {
  const scope = scopeOf(ctx);
  await envAccessService.require(ctx);
  return scope;
}

/** Tech manages every category; a channel manager only the OTP channel's. */
async function requireManage(ctx: GraphQLContext, category: string | null | undefined): Promise<void> {
  const user = requireRole(ctx, [...TECH_MANAGE, ...CHANNEL_MANAGE]);
  if (!hasRole(user, TECH_MANAGE) && category !== CHANNEL_CATEGORY) {
    throw new GraphQLError('Access Denied', { extensions: { code: 'FORBIDDEN' } });
  }
  await envAccessService.require(ctx);
}

/** Tech-only operations, behind the same emailed-code unlock. */
async function requireTech(ctx: GraphQLContext): Promise<void> {
  requireRole(ctx, TECH_MANAGE);
  await envAccessService.require(ctx);
}

/** The entry an id names, once the caller may manage its category. */
async function manageable(ctx: GraphQLContext, id: string) {
  const entry = await envEntryService.get(id);
  await requireManage(ctx, entry?.category);
  return entry;
}

/** Convert [{key,value}] input into a typed config object (number/bool coercion). */
function pairsToConfig(category: EnvCategory, pairs?: { key: string; value: string }[] | null): EnvEntryConfig {
  if (!pairs) return {};
  const defs = new Map(CATEGORY_FIELDS[category].map((f) => [f.name, f]));
  const out: EnvEntryConfig = {};
  for (const { key, value } of pairs) {
    const def = defs.get(key);
    if (!def) continue;
    if (def.number) out[key] = value === '' ? '' : Number(value);
    else if (def.bool) out[key] = value === 'true' || value === '1';
    else out[key] = value;
  }
  return out;
}

export const envEntryResolvers = {
  Query: {
    envEntries: async (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      const scope = await readScope(ctx);
      // A confined caller's filter cannot name another category: theirs is pinned over it.
      return envEntryService.list(scope ? { ...args.filter, category: scope } : args.filter ?? {});
    },
    envEntriesTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      const scope = await readScope(ctx);
      return envEntryService.table(args.query, scope ? { category: scope } : {});
    },
    envEntry: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const scope = await readScope(ctx);
      const entry = await envEntryService.get(args.id);
      if (scope && entry?.category !== scope) return null;
      return entry;
    },
    // No secrets in the catalogue, so it answers while locked too.
    envCategories: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const scope = scopeOf(ctx);
      const categories: readonly EnvCategory[] = scope ? [scope] : ENV_CATEGORIES;
      return categories.map((category) => ({
        category,
        label: CATEGORY_LABELS[category],
        docUrl: CATEGORY_DOCS[category],
        apiDocsUrl: CATEGORY_API_DOCS[category] ?? null,
        description: CATEGORY_DESCRIPTIONS[category],
        groupKey: groupOf(category).key,
        groupLabel: groupOf(category).label,
        groupDescription: groupOf(category).description,
        fields: CATEGORY_FIELDS[category].map((f) => ({
          name: f.name,
          label: f.label,
          secret: !!f.secret,
          number: !!f.number,
          bool: !!f.bool,
          phone: !!f.phone,
          hint: f.hint ?? null,
        })),
      }));
    },
    envEntriesForPortal: async (_p: unknown, args: { portalKey: string }, ctx: GraphQLContext) => {
      await requireTech(ctx);
      return envEntryService.listForPortal(args.portalKey);
    },
    envTestAttempts: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      await manageable(ctx, args.id);
      return envAttemptService.forEntry(args.id);
    },
    envAttemptSettings: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      await requireTech(ctx);
      return envAttemptService.settings();
    },
    // The one env read that works while locked: the gate needs to know.
    envAccessStatus: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      scopeOf(ctx);
      return envAccessService.status(ctx);
    },
    envTestHistory: async (
      _p: unknown,
      args: { entryId?: string | null; category?: string | null; limit?: number | null },
      ctx: GraphQLContext
    ) => {
      const scope = await readScope(ctx);
      if (scope && args.category && args.category !== scope) return [];
      if (args.entryId) {
        const entry = await envEntryService.get(args.entryId);
        if (!entry || (scope && entry.category !== scope)) return [];
      }
      return envTestLogService.history(args.entryId, args.limit, scope ?? args.category);
    },
    envOverview: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      await requireTech(ctx);
      return envTestLogService.overview();
    },
  },

  Mutation: {
    requestEnvAccessCode: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      scopeOf(ctx);
      return envAccessService.request(ctx);
    },
    verifyEnvAccessCode: async (_p: unknown, args: { challengeId: string; code: string }, ctx: GraphQLContext) => {
      scopeOf(ctx);
      return envAccessService.verify(ctx, args.challengeId, args.code);
    },
    lockEnvAccess: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      scopeOf(ctx);
      return envAccessService.lock(ctx);
    },
    createEnvEntry: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      await requireManage(ctx, args.input.category);
      const { config, ...rest } = args.input;
      return envEntryService.create({ ...rest, config: pairsToConfig(rest.category, config) });
    },
    updateEnvEntry: async (_p: unknown, args: { id: string; input: any }, ctx: GraphQLContext) => {
      const existing = await manageable(ctx, args.id);
      const category = existing?.category ?? 'EMAIL';
      const { config, ...rest } = args.input;
      return envEntryService.update(args.id, {
        ...rest,
        config: config ? pairsToConfig(category, config) : undefined,
      });
    },
    deleteEnvEntry: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      await manageable(ctx, args.id);
      return envEntryService.remove(args.id);
    },
    setDefaultEnvEntry: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      await manageable(ctx, args.id);
      return envEntryService.setDefault(args.id);
    },
    updateEnvAttemptSettings: async (
      _p: unknown,
      args: { input: { window_hours: number; limits: EnvAttemptLimitInput[] } },
      ctx: GraphQLContext
    ) => {
      await requireTech(ctx);
      return envAttemptService.updateSettings(args.input);
    },
    testEnvEntry: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      await manageable(ctx, args.id);
      return envEntryService.test(args.id, ctx.user?.id);
    },
    setPortalEnvEntries: async (
      _p: unknown,
      args: { portalKey: string; entryIds: string[] },
      ctx: GraphQLContext
    ) => {
      await requireTech(ctx);
      return envEntryService.setPortalAssignments(args.portalKey, args.entryIds);
    },

    importEnvEntries: async (_p: unknown, args: { entries: any[] }, ctx: GraphQLContext) => {
      await requireTech(ctx);
      // Each entry's own category decides which keys survive: pairsToConfig
      // drops anything the category does not define, so a file carrying a key
      // this server has never heard of cannot smuggle it into the document.
      return envEntryService.importEntries(
        args.entries.map(({ config, ...rest }) => ({
          ...rest,
          config: pairsToConfig(rest.category, config),
        }))
      );
    },

    testEnvConnection: async (
      _p: unknown,
      args: { id: string; input?: { to?: string | null } | null },
      ctx: GraphQLContext
    ) => {
      await manageable(ctx, args.id);
      // The signed-in admin is who a live test message falls back to, so the
      // caller cannot nominate somebody else's number by omitting one.
      return envEntryTests.connection(args.id, args.input?.to, ctx.user?.id);
    },

    testEnvEmail: async (_p: unknown, args: { id: string; to: string }, ctx: GraphQLContext) => {
      await requireTech(ctx);
      return envEntryTests.email(args.id, args.to, ctx.user?.id);
    },
    testEnvImagekitUpload: async (
      _p: unknown,
      args: { id: string; fileBase64: string; fileName: string },
      ctx: GraphQLContext
    ) => {
      await requireTech(ctx);
      return envEntryTests.imagekitUpload(args.id, args.fileBase64, args.fileName, ctx.user?.id);
    },
    testEnvPexels: async (_p: unknown, args: { id: string; query: string }, ctx: GraphQLContext) => {
      await requireTech(ctx);
      return envEntryTests.pexels(args.id, args.query, ctx.user?.id);
    },
    testEnvTwilioCall: async (_p: unknown, args: { id: string; to: string }, ctx: GraphQLContext) => {
      await requireTech(ctx);
      return envEntryTests.twilioCall(args.id, args.to, ctx.user?.id);
    },
    testEnvOpenai: async (_p: unknown, args: { id: string; prompt: string }, ctx: GraphQLContext) => {
      await requireTech(ctx);
      return envEntryTests.openai(args.id, args.prompt, ctx.user?.id);
    },
    testEnvGemini: async (_p: unknown, args: { id: string; prompt: string }, ctx: GraphQLContext) => {
      await requireTech(ctx);
      return envEntryTests.gemini(args.id, args.prompt, ctx.user?.id);
    },
    testEnvMsg91: async (
      _p: unknown,
      args: { id: string; input: Msg91TestInput },
      ctx: GraphQLContext
    ) => {
      await manageable(ctx, args.id);
      return envEntryTests.msg91(args.id, args.input, ctx.user?.id);
    },
  },
};
