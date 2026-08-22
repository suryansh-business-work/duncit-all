import { waCampaignService } from './waCampaign.service';
import { waLogService } from './waLog.service';
import type { WaCampaignAudience } from './waCampaign.model';
import type { ManualContact } from './waCampaign.recipients';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

// Same roles as the rest of the marketing console.
const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER'];

export const waCampaignResolvers = {
  Query: {
    waCampaignConfigured: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.configured();
    },
    waCampaignNames: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.names();
    },
    waCampaignVariables: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.variables();
    },
    waCampaignReach: (
      _p: unknown,
      args: {
        audience: WaCampaignAudience;
        audience_list_id?: string | null;
        user_ids?: string[] | null;
        contacts?: ManualContact[] | null;
      },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.reach(args.audience, {
        audience_list_id: args.audience_list_id,
        user_ids: args.user_ids ?? [],
        contacts: args.contacts ?? [],
      });
    },
    waCampaignUserSearch: (_p: unknown, args: { search: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.userSearch(args.search);
    },
    waPricing: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.pricing();
    },
    waCampaignDashboard: (
      _p: unknown,
      args: { from?: string | null; to?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.dashboard({ from: args.from, to: args.to });
    },
    waCampaignsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.table(args.query);
    },
    waLogs: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waLogService.table(args.query);
    },
    waCampaign: (_p: unknown, args: { campaign_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.byId(args.campaign_id);
    },
    waCampaignRecipients: (
      _p: unknown,
      args: { campaign_id: string; query?: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.recipients(args.campaign_id, args.query);
    },
    waCampaignRecipientsCsv: (_p: unknown, args: { campaign_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.recipientsCsv(args.campaign_id);
    },
    aisensyProjectConfigured: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.projectConfigured();
    },
    aisensyCampaigns: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.aisensyCampaigns();
    },
    aisensyTemplates: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.aisensyTemplates();
    },
  },

  Mutation: {
    createWaCampaignName: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.createName(args.input, user.id);
    },
    deleteWaCampaignName: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.removeName(args.id);
    },
    sendWaCampaign: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.send(args.input, user.id);
    },
    cancelWaCampaign: (_p: unknown, args: { campaign_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.cancel(args.campaign_id);
    },
    retryWaCampaign: (_p: unknown, args: { campaign_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.retry(args.campaign_id);
    },
    sendWaTestMessage: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.testSend(args.input);
    },
    deleteWaCampaign: (_p: unknown, args: { campaign_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.remove(args.campaign_id);
    },
    updateWaPricing: (_p: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return waCampaignService.updatePricing(args.input);
    },
  },
};
