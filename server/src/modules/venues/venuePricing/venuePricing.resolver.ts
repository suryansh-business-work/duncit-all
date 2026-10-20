import type { GraphQLContext } from '@context';
import { hasRole, requireAuth, requireRole } from '@middleware/rbac';
import { consoleEditors, consoleReaders } from '@modules/portals/console-access';
import { venuePricingService, type InstantBookingRequest } from './venuePricing.service';
import { venueBookingsService } from './venueBookings.service';

/** Same roles that may edit a venue's settings on the owner's behalf (venue.resolver). */
const VENUE_EDIT = consoleEditors('VENUE');

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

type OwnerListArgs = { venue_id?: string | null; limit?: number | null };

export const venuePricingResolvers = {
  Query: {
    venuesNeedingPricingSetup: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, consoleReaders('VENUE'));
      return venuePricingService.setupGaps();
    },
    myVenueUpcomingBookings: (_p: unknown, args: OwnerListArgs, ctx: GraphQLContext) =>
      venueBookingsService.upcoming(requireAuth(ctx).id, args.venue_id, args.limit),
    myVenueSlotRequestHistory: (_p: unknown, args: OwnerListArgs, ctx: GraphQLContext) =>
      venueBookingsService.requestHistory(requireAuth(ctx).id, args.venue_id, args.limit),
    venuePricing: (_p: unknown, args: { venue_id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return venuePricingService.pricingFor(args.venue_id);
    },
    venueBookingCalendar: async (
      _p: unknown,
      args: { venue_id: string; from: string; to: string; space_label?: string | null },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      const cal = await venuePricingService.calendar(args.venue_id, args.from, args.to, args.space_label);
      return {
        ...cal,
        days: cal.days.map((d) => ({
          ...d,
          open: iso(d.open),
          close: iso(d.close),
          busy: d.busy.map((b) => ({ start: iso(b.start), end: iso(b.end) })),
          slots: d.slots.map((s) => ({ ...s, start: iso(s.start), end: iso(s.end) })),
        })),
      };
    },
    venuePriceQuote: (
      _p: unknown,
      args: { venue_id: string; booking: InstantBookingRequest; draft?: unknown },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return venuePricingService.quote(user.id, args.venue_id, args.booking, args.draft);
    },
  },
  Mutation: {
    updateVenuePricing: (_p: unknown, args: { venue_id: string; input: unknown }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return venuePricingService.savePricing(user.id, hasRole(user, VENUE_EDIT), args.venue_id, args.input);
    },
  },
};
