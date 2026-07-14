import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { apiKeyService } from './apiKey.service';

const API_KEY_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER', 'DEVELOPERS_MANAGER'];

export const apiKeyResolvers = {
  Query: {
    myApiKeys: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, API_KEY_MANAGE);
      return apiKeyService.listForOwner(user.id);
    },
    myApiKeysTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, API_KEY_MANAGE);
      return apiKeyService.tableForOwner(user.id, args.query);
    },
  },
  Mutation: {
    createApiKey: async (_p: unknown, args: { name: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, API_KEY_MANAGE);
      const { raw_key, pub } = await apiKeyService.create(user.id, args.name);
      return { api_key: pub, raw_key };
    },
    revokeApiKey: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, API_KEY_MANAGE);
      return apiKeyService.revoke(args.id, user.id);
    },
  },
};
