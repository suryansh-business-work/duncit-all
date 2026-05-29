import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { venueSlotService } from './venueSlot.service';

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
  },
};
