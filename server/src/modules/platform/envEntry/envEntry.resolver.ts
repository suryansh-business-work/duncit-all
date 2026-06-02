import { envEntryService, type EnvEntryConfig } from './envEntry.service';
import { envEntryTests } from './envEntry.tests';
import { CATEGORY_FIELDS, CATEGORY_DOCS } from './envEntry.fields';
import { ENV_CATEGORIES, type EnvCategory } from './envEntry.model';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const TECH_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

const CATEGORY_LABELS: Record<EnvCategory, string> = {
  EMAIL: 'Email (SMTP)',
  IMAGEKIT: 'ImageKit',
  PEXELS: 'Pexels',
  GOOGLE_OAUTH: 'Google OAuth',
  GOOGLE_MAPS: 'Google Map',
  TWILIO: 'Twilio',
  OPENAI: 'OpenAI',
  GEMINI: 'Gemini',
};

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
      requireRole(ctx, TECH_MANAGE);
      return envEntryService.list(args.filter ?? {});
    },
    envEntry: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return envEntryService.get(args.id);
    },
    envCategories: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return ENV_CATEGORIES.map((category) => ({
        category,
        label: CATEGORY_LABELS[category],
        docUrl: CATEGORY_DOCS[category] ?? null,
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
      requireRole(ctx, TECH_MANAGE);
      return envEntryService.listForPortal(args.portalKey);
    },
  },

  Mutation: {
    createEnvEntry: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      const { config, ...rest } = args.input;
      return envEntryService.create({ ...rest, config: pairsToConfig(rest.category, config) });
    },
    updateEnvEntry: async (_p: unknown, args: { id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      const existing = await envEntryService.get(args.id);
      const category = (existing?.category ?? 'EMAIL') as EnvCategory;
      const { config, ...rest } = args.input;
      return envEntryService.update(args.id, {
        ...rest,
        config: config ? pairsToConfig(category, config) : undefined,
      });
    },
    deleteEnvEntry: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return envEntryService.remove(args.id);
    },
    setDefaultEnvEntry: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return envEntryService.setDefault(args.id);
    },
    testEnvEntry: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return envEntryService.test(args.id);
    },
    setPortalEnvEntries: async (
      _p: unknown,
      args: { portalKey: string; entryIds: string[] },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, TECH_MANAGE);
      return envEntryService.setPortalAssignments(args.portalKey, args.entryIds);
    },

    testEnvEmail: async (_p: unknown, args: { id: string; to: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return envEntryTests.email(args.id, args.to);
    },
    testEnvImagekitUpload: async (
      _p: unknown,
      args: { id: string; fileBase64: string; fileName: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, TECH_MANAGE);
      return envEntryTests.imagekitUpload(args.id, args.fileBase64, args.fileName);
    },
    testEnvPexels: async (_p: unknown, args: { id: string; query: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return envEntryTests.pexels(args.id, args.query);
    },
    testEnvTwilioCall: async (_p: unknown, args: { id: string; to: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return envEntryTests.twilioCall(args.id, args.to);
    },
    testEnvOpenai: async (_p: unknown, args: { id: string; prompt: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return envEntryTests.openai(args.id, args.prompt);
    },
    testEnvGemini: async (_p: unknown, args: { id: string; prompt: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return envEntryTests.gemini(args.id, args.prompt);
    },
  },
};
