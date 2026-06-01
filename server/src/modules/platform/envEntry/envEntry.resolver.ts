import { envEntryService, type EnvEntryConfig } from './envEntry.service';
import { CATEGORY_FIELDS } from './envEntry.fields';
import { ENV_CATEGORIES, type EnvCategory } from './envEntry.model';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const TECH_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

const CATEGORY_LABELS: Record<EnvCategory, string> = {
  EMAIL: 'Email (SMTP)',
  IMAGEKIT: 'ImageKit',
  PEXELS: 'Pexels',
  GOOGLE: 'Google',
  TWILIO: 'Twilio',
  AI: 'AI Provider',
  VOBIZ: 'Vobiz',
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
        fields: CATEGORY_FIELDS[category].map((f) => ({
          name: f.name,
          label: f.label,
          secret: !!f.secret,
          number: !!f.number,
          bool: !!f.bool,
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
  },
};
