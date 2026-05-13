import type { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/rbac';
import { marketingService } from './marketing.service';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const marketingResolvers = {
  Query: {
    marketingCampaigns: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return marketingService.list();
    },
    marketingCampaignPreviewCards: (
      _p: unknown,
      args: { type: 'POD' | 'CLUB' },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return marketingService.previewCards(args.type);
    },
    renderMarketingCampaign: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return marketingService.renderPreview(args.input);
    },
  },
  Mutation: {
    createMarketingCampaign: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return marketingService.create(args.input, ctx.user?.id ?? null);
    },
    sendMarketingCampaign: (_p: unknown, args: { campaign_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return marketingService.send(args.campaign_id);
    },
  },
};