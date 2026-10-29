import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import { consoleReaders } from '@modules/portals/console-access';
import { venuePricingService } from '@modules/venues/venuePricing/venuePricing.service';
import { venueOfferService, type VenueOfferMoveTerms } from './venueOffer.service';
import { requestCountersPerSide } from './venueOffer.limits';
import { venueOfferReviseService } from './venueOffer.revise';
import { venueOfferStaffService } from './venueOffer.staff';
import { isFreeArrangement, type VenueOfferRequest } from './venueOffer.types';

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** Staff who may read a venue's record in the Venues console may read its booking terms. */
const VENUE_READ = consoleReaders('VENUE');

type CalendarArgs = { venue_id: string; from: string; to: string; space_label?: string | null };
type MoveArgs = { terms: VenueOfferMoveTerms; note?: string | null; round?: number | null };

export const venueOfferResolvers = {
  Query: {
    venueOfferQuote: (_p: unknown, args: { venue_id: string; offer: VenueOfferRequest }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      // Create Pod's quote: priced from the venue's own minimum, as the offer it sends will be — FREE included.
      return venueOfferService.preview(args.venue_id, args.offer, undefined, true, true);
    },
    venueCounterQuote: (_p: unknown, args: { slot_id: string; terms: VenueOfferMoveTerms }, ctx: GraphQLContext) =>
      venueOfferService.counterPreview(requireAuth(ctx).id, args.slot_id, args.terms),
    hostCounterQuote: (_p: unknown, args: { pod_id: string; terms: VenueOfferMoveTerms }, ctx: GraphQLContext) =>
      venueOfferService.hostCounterPreview(requireAuth(ctx).id, args.pod_id, args.terms),
    editCounterQuote: (_p: unknown, args: { pod_id: string; terms: VenueOfferMoveTerms }, ctx: GraphQLContext) =>
      venueOfferReviseService.editPreview(requireAuth(ctx).id, args.pod_id, args.terms),
    venueOfferCalendar: async (_p: unknown, args: CalendarArgs, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const cal = await venuePricingService.calendar(args.venue_id, args.from, args.to, args.space_label);
      return {
        ...cal,
        // The host prices every booking: the venue's own model and limits do not apply.
        model: null,
        configured: true,
        booking_increment_minutes: 0,
        min_hours: 0,
        max_hours: 0,
        min_pax: 0,
        max_pax: 0,
        days: cal.days.map((d) => ({
          ...d,
          open: iso(d.open),
          close: iso(d.close),
          busy: d.busy.map((b) => ({ start: iso(b.start), end: iso(b.end) })),
          slots: [],
        })),
      };
    },
    adminVenueBookingTerms: (_p: unknown, args: { venue_id: string; limit?: number | null }, ctx: GraphQLContext) => {
      requireRole(ctx, VENUE_READ);
      return venueOfferStaffService.bookingTerms(args.venue_id, args.limit);
    },
    podVenueOffer: (_p: unknown, args: { pod_id: string }, ctx: GraphQLContext) =>
      venueOfferService.forPod(requireAuth(ctx).id, args.pod_id),
  },
  Mutation: {
    counterVenueOffer: (_p: unknown, args: MoveArgs & { slot_id: string }, ctx: GraphQLContext) =>
      venueOfferService.counter(requireAuth(ctx).id, args.slot_id, args.terms, args.note, args.round),
    acceptVenueCounterOffer: (_p: unknown, args: { pod_id: string; round?: number | null }, ctx: GraphQLContext) =>
      venueOfferService.hostAccept(requireAuth(ctx).id, args.pod_id, args.round),
    rejectVenueCounterOffer: (
      _p: unknown,
      args: { pod_id: string; reason?: string | null; round?: number | null },
      ctx: GraphQLContext
    ) => venueOfferService.hostReject(requireAuth(ctx).id, args.pod_id, args.reason, args.round),
    counterVenueOfferAsHost: (_p: unknown, args: MoveArgs & { pod_id: string }, ctx: GraphQLContext) =>
      venueOfferService.hostCounter(requireAuth(ctx).id, args.pod_id, args.terms, args.note, args.round),
    editVenueOfferCounter: (_p: unknown, args: MoveArgs & { pod_id: string; round: number }, ctx: GraphQLContext) =>
      venueOfferReviseService.editCounter(requireAuth(ctx).id, args.pod_id, args.terms, args.note, args.round),
    withdrawVenueOfferCounter: (_p: unknown, args: { pod_id: string; round: number }, ctx: GraphQLContext) =>
      venueOfferReviseService.withdrawCounter(requireAuth(ctx).id, args.pod_id, args.round),
  },
  VenueBookingOffer: {
    // One settings read per request, however many offers a list carries. A free
    // venue or a free pod is accepted or declined, never countered: none for either side.
    counters_per_side: (parent: { model?: string | null; free_pod?: boolean | null }, _a: unknown, ctx: GraphQLContext) =>
      isFreeArrangement(parent) ? Promise.resolve(0) : requestCountersPerSide(ctx),
  },
};
