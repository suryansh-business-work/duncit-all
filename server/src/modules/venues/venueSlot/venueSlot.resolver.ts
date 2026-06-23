import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import { venueSlotService } from './venueSlot.service';

const ONBOARDING_RW = ['SUPER_ADMIN', 'ONBOARDING_MANAGER'];

export const venueSlotResolvers = {
  Query: {
    venueSlots: (
      _p: unknown,
      args: { venue_id: string; from?: string | null; to?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return venueSlotService.listForVenue(user.id, args.venue_id, args.from, args.to);
    },
    venueAvailableSlots: (_p: unknown, args: { venue_id: string; from?: string | null }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return venueSlotService.listAvailable(args.venue_id, args.from);
    },
    adminVenueSlots: (
      _p: unknown,
      args: { venue_id: string; from?: string | null; to?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ONBOARDING_RW);
      return venueSlotService.adminListForVenue(args.venue_id, args.from, args.to);
    },
  },
  Mutation: {
    createVenueSlots: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return venueSlotService.create(user.id, args.input);
    },
    updateVenueSlot: (_p: unknown, args: { slot_id: string; input: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return venueSlotService.update(user.id, args.slot_id, args.input);
    },
    deleteVenueSlot: (_p: unknown, args: { slot_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return venueSlotService.remove(user.id, args.slot_id);
    },
    adminCreateVenueSlots: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ONBOARDING_RW);
      return venueSlotService.adminCreate(args.input);
    },
    adminUpdateVenueSlot: (_p: unknown, args: { slot_id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ONBOARDING_RW);
      return venueSlotService.adminUpdate(args.slot_id, args.input);
    },
    adminDeleteVenueSlot: (_p: unknown, args: { slot_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ONBOARDING_RW);
      return venueSlotService.adminRemove(args.slot_id);
    },
  },
};
