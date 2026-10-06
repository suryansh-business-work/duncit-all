import { websiteReelService } from './websiteReel.service';
import { websiteReelSettingsService, type WebsiteReelSettingsInput } from './websiteReel.settings';
import { websiteReelInputSchema } from './websiteReel.validator';
import type { WebsiteNavSite } from '../websiteNav/websiteNav.model';
import type { TableQueryInput } from '@utils/table-query';
import { validate } from '@utils/validate';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'WEBSITE_MANAGER'];

export const websiteReelResolvers = {
  Query: {
    // Public — every website's home page asks for its slider at load time.
    publicWebsiteReels: async (_p: unknown, args: { site: WebsiteNavSite }) =>
      websiteReelService.publicList(args.site),
    websiteReelsTable: async (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return websiteReelService.table(args.query);
    },
    websiteReelSettings: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return websiteReelSettingsService.pub();
    },
  },
  Mutation: {
    createWebsiteReel: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      const data = await validate(websiteReelInputSchema, args.input);
      return websiteReelService.create(data);
    },
    updateWebsiteReel: async (
      _p: unknown,
      args: { reel_id: string; input: unknown },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      const data = await validate(websiteReelInputSchema, args.input);
      return websiteReelService.update(args.reel_id, data);
    },
    deleteWebsiteReel: async (_p: unknown, args: { reel_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return websiteReelService.remove(args.reel_id);
    },
    updateWebsiteReelSettings: async (
      _p: unknown,
      args: { input: WebsiteReelSettingsInput },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, ADMIN_ROLES);
      return websiteReelSettingsService.update(args.input ?? {}, String(user.id));
    },
  },
};
