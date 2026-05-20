import { venueTimeslotService } from './venueTimeslot.service';
import type { GraphQLContext } from '../../context';
import { requireAuth } from '../../middleware/rbac';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];

const isAdminCtx = (ctx: GraphQLContext) =>
  !!ctx.user?.roles?.some((r) => ADMIN_ROLES.includes(r));

const uid = (ctx: GraphQLContext) => requireAuth(ctx).id;

export const venueTimeslotResolvers = {
  Query: {
    myVenueTimeslotTemplates: async (
      _p: unknown,
      args: { venue_id: string },
      ctx: GraphQLContext,
    ) => venueTimeslotService.listTemplates(args.venue_id, uid(ctx), isAdminCtx(ctx)),

    myVenueTimeslotBlocks: async (
      _p: unknown,
      args: { venue_id: string; from?: string; to?: string },
      ctx: GraphQLContext,
    ) =>
      venueTimeslotService.listBlocks(
        args.venue_id,
        uid(ctx),
        isAdminCtx(ctx),
        args.from,
        args.to,
      ),

    venueTimeslotOverrides: async (
      _p: unknown,
      args: { venue_id: string; from?: string; to?: string },
      ctx: GraphQLContext,
    ) =>
      venueTimeslotService.listOverrides(
        args.venue_id,
        uid(ctx),
        isAdminCtx(ctx),
        args.from,
        args.to,
      ),

    venueTimeslotInstances: async (
      _p: unknown,
      args: { venue_id: string; from: string; to: string },
      ctx: GraphQLContext,
    ) =>
      venueTimeslotService.listInstances(
        args.venue_id,
        uid(ctx),
        isAdminCtx(ctx),
        args.from,
        args.to,
      ),
  },
  Mutation: {
    createVenueTimeslotTemplate: async (
      _p: unknown,
      args: { venue_id: string; input: any },
      ctx: GraphQLContext,
    ) =>
      venueTimeslotService.createTemplate(
        args.venue_id,
        uid(ctx),
        isAdminCtx(ctx),
        args.input,
      ),
    updateVenueTimeslotTemplate: async (
      _p: unknown,
      args: { template_id: string; input: any },
      ctx: GraphQLContext,
    ) =>
      venueTimeslotService.updateTemplate(
        args.template_id,
        uid(ctx),
        isAdminCtx(ctx),
        args.input,
      ),
    deleteVenueTimeslotTemplate: async (
      _p: unknown,
      args: { template_id: string },
      ctx: GraphQLContext,
    ) => venueTimeslotService.deleteTemplate(args.template_id, uid(ctx), isAdminCtx(ctx)),
    setVenueTimeslotTemplateActive: async (
      _p: unknown,
      args: { template_id: string; active: boolean },
      ctx: GraphQLContext,
    ) =>
      venueTimeslotService.setTemplateActive(
        args.template_id,
        uid(ctx),
        isAdminCtx(ctx),
        args.active,
      ),
    blockVenueTimeslot: async (
      _p: unknown,
      args: { venue_id: string; input: any },
      ctx: GraphQLContext,
    ) => venueTimeslotService.blockTimeslot(args.venue_id, uid(ctx), isAdminCtx(ctx), args.input),
    unblockVenueTimeslot: async (
      _p: unknown,
      args: { block_id: string },
      ctx: GraphQLContext,
    ) => venueTimeslotService.unblockTimeslot(args.block_id, uid(ctx), isAdminCtx(ctx)),
    overrideVenueTimeslotCapacity: async (
      _p: unknown,
      args: {
        venue_id: string;
        template_id: string;
        occurrence_date: string;
        capacity_override?: number | null;
        is_cancelled?: boolean;
        note?: string;
      },
      ctx: GraphQLContext,
    ) =>
      venueTimeslotService.overrideCapacity(args.venue_id, uid(ctx), isAdminCtx(ctx), {
        template_id: args.template_id,
        occurrence_date: args.occurrence_date,
        capacity_override: args.capacity_override ?? null,
        is_cancelled: !!args.is_cancelled,
        note: args.note ?? '',
      }),
    clearVenueTimeslotOverride: async (
      _p: unknown,
      args: { override_id: string },
      ctx: GraphQLContext,
    ) => venueTimeslotService.clearOverride(args.override_id, uid(ctx), isAdminCtx(ctx)),
  },
};
