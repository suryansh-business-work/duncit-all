import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { marketingService } from './marketing.service';
import { marketingDashboardService } from './marketingDashboard.service';
import { audienceService } from './audience.service';
import { audienceListService } from './audienceList.service';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER'];

export const marketingResolvers = {
  Query: {
    marketingDashboard: (_p: unknown, args: { days?: number | null }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return marketingDashboardService.overview(args.days ?? 30);
    },
    audienceTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return audienceService.table(args.query);
    },
    audienceFilterOptions: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return audienceService.filterOptions();
    },
    audienceListsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return audienceListService.table(args.query);
    },
    audienceListMembersTable: (
      _p: unknown,
      args: { list_id: string; query?: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return audienceListService.membersTable(args.list_id, args.query);
    },
    audienceList: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return audienceListService.get(args.id);
    },
    audienceListOwners: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return audienceListService.ownerOptions();
    },
    audienceLists: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return audienceListService.list();
    },
    marketingCampaigns: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return marketingService.list();
    },
    marketingCampaign: (_p: unknown, args: { campaign_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return marketingService.byId(args.campaign_id);
    },
    marketingCampaignVariables: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return marketingService.variables();
    },
    marketingCampaignsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return marketingService.table(args.query);
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
    createAudienceList: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return audienceListService.create(args.input, ctx.user?.id ?? null);
    },
    addAudienceListMembers: (
      _p: unknown,
      args: { id: string; user_ids: string[] },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return audienceListService.addMembers(args.id, args.user_ids);
    },
    deleteAudienceList: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return audienceListService.remove(args.id);
    },
    deleteMarketingCampaign: (_p: unknown, args: { campaign_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return marketingService.remove(args.campaign_id);
    },
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