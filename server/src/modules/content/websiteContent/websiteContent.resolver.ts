import { websiteContentService } from './websiteContent.service';
import { websiteContentInputSchema } from './websiteContent.validator';
import { validate } from '@utils/validate';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER', 'WEBSITE_MANAGER'];
const WRITE_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'WEBSITE_MANAGER'];

export const websiteContentResolvers = {
  Query: {
    websiteContent: async (_p: unknown, args: { type?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return websiteContentService.list(args.type ?? null, false);
    },
    publicWebsiteContent: async (_p: unknown, args: { type: any }) =>
      websiteContentService.list(args.type, true),
  },
  Mutation: {
    createWebsiteContent: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      requireRole(ctx, WRITE_ROLES);
      const data = await validate(websiteContentInputSchema, args.input);
      return websiteContentService.create(data);
    },
    updateWebsiteContent: async (
      _p: unknown,
      args: { content_id: string; input: unknown },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, WRITE_ROLES);
      const data = await validate(websiteContentInputSchema, args.input);
      return websiteContentService.update(args.content_id, data);
    },
    deleteWebsiteContent: async (_p: unknown, args: { content_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, WRITE_ROLES);
      return websiteContentService.remove(args.content_id);
    },
  },
};