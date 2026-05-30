import { integrationService } from './integration.service';
import type { IntegrationProviderType } from './integration.model';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

// SUPER_ADMIN and TECH_MANAGER (Tech portal) manage integration providers.
const TECH_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];
// Other consoles may read provider options (to pick one when needed).
const READ_ROLES = ['SUPER_ADMIN', 'TECH_MANAGER', 'CRM_MANAGER', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'];

export const integrationResolvers = {
  Query: {
    integrationProviders: async (
      _p: unknown,
      args: { filter?: { type?: IntegrationProviderType | null; is_active?: boolean | null } | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, TECH_MANAGE);
      return integrationService.list(args.filter ?? {});
    },
    integrationProvider: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return integrationService.get(args.id);
    },
    integrationProviderOptions: async (
      _p: unknown,
      args: { type: IntegrationProviderType },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, READ_ROLES);
      return integrationService.options(args.type);
    },
  },

  Mutation: {
    createIntegrationProvider: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return integrationService.create(args.input);
    },
    updateIntegrationProvider: async (
      _p: unknown,
      args: { id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, TECH_MANAGE);
      return integrationService.update(args.id, args.input);
    },
    deleteIntegrationProvider: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return integrationService.remove(args.id);
    },
    setDefaultIntegrationProvider: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return integrationService.setDefault(args.id);
    },
    testIntegrationProvider: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return integrationService.test(args.id);
    },
  },
};
