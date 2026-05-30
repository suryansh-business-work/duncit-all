import { settingsService } from './settings.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

// Feature flags and app settings (incl. JWT expiry) are managed from the Tech portal.
const ADMIN_READ = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER', 'TECH_MANAGER'];
const ADMIN_WRITE = ['SUPER_ADMIN', 'TECH_MANAGER'];
// Environment variables are managed from the Tech portal (and by super admins).
const ENV_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const settingsResolvers = {
  Query: {
    appSettings: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      return settingsService.getAppSettings();
    },
    publicAppSettings: async () => settingsService.getPublicAppSettings(),
    featureFlags: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      return settingsService.listFlags();
    },
    featureFlag: async (_p: unknown, args: { key: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      return settingsService.getFlag(args.key);
    },
    publicFeatureFlags: async () => settingsService.listPublicFlags(),
    branding: async () => settingsService.getBranding(),
    environmentScopes: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ENV_MANAGE);
      return settingsService.listEnvironmentScopes();
    },
    environmentVariables: async (
      _p: unknown,
      args: { scope?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ENV_MANAGE);
      return settingsService.listEnvironmentVariables(args.scope ?? undefined);
    },
  },
  Mutation: {
    updateAppSettings: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return settingsService.updateAppSettings(args.input);
    },
    createFeatureFlag: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return settingsService.createFlag(args.input);
    },
    updateFeatureFlag: async (
      _p: unknown,
      args: { flag_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return settingsService.updateFlag(args.flag_id, args.input);
    },
    setFeatureFlag: async (
      _p: unknown,
      args: { flag_id: string; enabled: boolean },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return settingsService.setFlagEnabled(args.flag_id, args.enabled);
    },
    deleteFeatureFlag: async (_p: unknown, args: { flag_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return settingsService.deleteFlag(args.flag_id);
    },
    updateBranding: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return settingsService.updateBranding(args.input);
    },
    updateEnvironmentVariable: async (
      _p: unknown,
      args: { scope?: string | null; key: string; value: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ENV_MANAGE);
      return settingsService.updateEnvironmentVariable(
        args.scope ?? 'server',
        args.key,
        args.value,
        ctx.user?.id ?? null
      );
    },
    clearEnvironmentVariable: async (
      _p: unknown,
      args: { scope?: string | null; key: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ENV_MANAGE);
      return settingsService.clearEnvironmentVariable(args.scope ?? 'server', args.key);
    },
  },
};
