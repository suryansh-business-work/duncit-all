import type { GraphQLContext } from '@context';
import { FINANCE_READER, hasRole, requireAuth, requireRole } from '@middleware/rbac';
import { consoleEditors } from '@modules/portals/console-access';
import type { TableQueryInput } from '@utils/table-query';
import { logs } from '@observability/log';
import { assertPlatformFinanceWrite } from '@modules/finance/financeScope';
import { rentalSettingsService, type RentalSettingsInput } from './rentalSettings.service';
import { rentalCatalogueService } from './rentalCatalogue.service';
import { hydrateRentalBookings, rentalBookingTableService } from './rentalBookingTable.service';
import { rentalLifecycleService } from './rentalLifecycle.service';
import { setVenueRentalDepositGst } from './rentalVenueSettings';

// The same seats that read and write Finance's own settings.
const FINANCE_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];
const FINANCE_READ = [...FINANCE_WRITE, FINANCE_READER];
const VENUE_EDIT = consoleEditors('VENUE');

/** The signed-in venue operator, and whether the venues console lets them act on any venue. */
function operator(ctx: GraphQLContext) {
  const user = requireAuth(ctx);
  return { userId: user.id, isAdmin: hasRole(user, VENUE_EDIT) };
}

interface MarkInput {
  outcome: 'RETURNED' | 'DAMAGED';
  damage_claim?: number | null;
  note?: string | null;
}

const one = async (doc: Parameters<typeof hydrateRentalBookings>[0][number]) => (await hydrateRentalBookings([doc]))[0];

export const venueRentalResolvers = {
  Query: {
    rentalSettings: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return rentalSettingsService.get();
    },
    publicRentalSettings: async () => {
      const s = await rentalSettingsService.get();
      return {
        enabled: s.enabled,
        terms_html: s.terms_html,
        rent_refundable_on_backout: s.rent_refundable_on_backout,
        deposit_refundable: s.deposit_refundable,
        booking_cutoff_hours: s.booking_cutoff_hours,
      };
    },
    podRentals: (_p: unknown, args: { pod_id: string }) => rentalCatalogueService.podCatalogue(args.pod_id),
    rentablePods: (_p: unknown, args: { limit?: number | null }) => rentalCatalogueService.rentablePods(args.limit),
    myRentalBookings: (_p: unknown, args: { limit?: number | null; offset?: number | null }, ctx: GraphQLContext) =>
      rentalCatalogueService.myBookings(requireAuth(ctx).id, args.limit, args.offset),
    rentalBookingsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return rentalBookingTableService.financeTable(args.query);
    },
    venueRentalBookingsTable: (
      _p: unknown,
      args: { venue_id: string; query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => rentalBookingTableService.venueTable(operator(ctx), args.venue_id, args.query),
    venueRentalStats: (_p: unknown, args: { venue_id: string }, ctx: GraphQLContext) =>
      rentalBookingTableService.venueStats(operator(ctx), args.venue_id),
  },
  Mutation: {
    updateRentalSettings: async (_p: unknown, args: { input: RentalSettingsInput }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, FINANCE_WRITE);
      // The commission and refund rules apply to every city at once.
      assertPlatformFinanceWrite(ctx, FINANCE_WRITE);
      const before = await rentalSettingsService.get();
      const after = await rentalSettingsService.update(args.input);
      // A money rule changed: who, and from what to what, for Finance's record.
      logs.server.info('rentalSettings', 'update', {
        actor_user_id: user.id,
        before: { ...before, terms_html: `${before.terms_html.length} chars` },
        after: { ...after, terms_html: `${after.terms_html.length} chars` },
      });
      return after;
    },
    markRentalBooking: async (_p: unknown, args: { id: string; input: MarkInput }, ctx: GraphQLContext) =>
      one(await rentalLifecycleService.markByVenue(operator(ctx), args.id, args.input)),
    setVenueRentalDepositGst: (_p: unknown, args: { venue_id: string; charge_gst: boolean }, ctx: GraphQLContext) => {
      // A tax decision: the Venues console's, never the owner's.
      const user = requireRole(ctx, VENUE_EDIT);
      return setVenueRentalDepositGst(user.id, args.venue_id, args.charge_gst);
    },
    markRentalRefunded: async (_p: unknown, args: { id: string; reference: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, FINANCE_WRITE);
      return one(await rentalLifecycleService.markRefunded(user.id, args.id, args.reference));
    },
  },
};
