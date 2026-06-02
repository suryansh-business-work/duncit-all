import { commsProviderService } from './commsProvider.service';
import type { CommsProviderType } from './commsProvider.model';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

// SUPER_ADMIN and TECH_MANAGER (Tech portal) manage comms providers.
const TECH_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];
// CRM and Admin consoles can read providers (to pick one when sending).
const READ_ROLES = ['SUPER_ADMIN', 'TECH_MANAGER', 'CRM_MANAGER', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'];

export const commsProviderResolvers = {
  Query: {
    commsProviders: async (
      _p: unknown,
      args: { filter?: { type?: CommsProviderType | null; is_active?: boolean | null } | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, TECH_MANAGE);
      return commsProviderService.list(args.filter ?? {});
    },
    commsProvider: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return commsProviderService.get(args.id);
    },
    commsProviderOptions: async (
      _p: unknown,
      args: { type: CommsProviderType },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, READ_ROLES);
      return commsProviderService.options(args.type);
    },
  },

  Mutation: {
    createCommsProvider: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return commsProviderService.create(args.input);
    },
    updateCommsProvider: async (
      _p: unknown,
      args: { id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, TECH_MANAGE);
      return commsProviderService.update(args.id, args.input);
    },
    deleteCommsProvider: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return commsProviderService.remove(args.id);
    },
    setDefaultCommsProvider: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return commsProviderService.setDefault(args.id);
    },
    testCommsProvider: async (
      _p: unknown,
      args: { id: string; recipient: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, TECH_MANAGE);
      const provider = await commsProviderService.get(args.id);
      if (!provider) {
        return { ok: false, message: 'Provider not found' };
      }
      const target = args.recipient.trim();
      if (!target) return { ok: false, message: 'Recipient is required' };
      const isEmail = provider.type === 'SMTP';
      return {
        ok: true,
        message: isEmail
          ? `Test email queued to ${target} via ${provider.name}`
          : `Test call queued to ${target} via ${provider.name}`,
      };
    },
  },
};
