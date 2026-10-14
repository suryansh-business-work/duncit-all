import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { venueService } from './venue.service';
import { venuePodsService } from './venuePods.service';
import { userService } from '@modules/access/user/user.service';
import {
  effectiveFoodTax,
  getFoodTaxDefaults,
  type FoodTaxOverride,
} from '@modules/finance/finance/foodTaxDefaults';
import { PodModel } from '@modules/pods/pod/pod.model';
import { podService } from '@modules/pods/pod/pod.service';
import { MeetingModel } from '@modules/survey/meeting.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import type { GraphQLContext } from '@context';
import { hasRole, requireRole } from '@middleware/rbac';
import {
  consoleEditors,
  consoleGovernors,
  consoleReaders,
} from '@modules/portals/console-access';

/**
 * Reading and editing a venue's own details also belongs to whoever was granted
 * the venues console (`ALL_VENUES_ACCESS`); approving one, setting its
 * percentages and flipping it dark do NOT — see `console-access.ts`.
 */
const VENUE_READ = consoleReaders('VENUE');
const VENUE_EDIT = consoleEditors('VENUE');
const VENUE_GOVERN = consoleGovernors('VENUE');
// The money a venue's terms move — its deductions, the auto-cancel trigger and
// the refund ladder. Finance sets these too (Finance portal → overrides).
const VENUE_FINANCE = [...VENUE_GOVERN, 'FINANCE_MANAGER'];
// Permanent hard-delete is a developer-only action (mirrors the API-key gate).
const DEVELOPER_DELETE = ['SUPER_ADMIN', 'DEVELOPERS_MANAGER'];

function uid(ctx: GraphQLContext) {
  if (!ctx.user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  return ctx.user.id;
}

/**
 * Finance's food GST default, read once per request however many venues the
 * request resolves — keyed on the request's own context object.
 */
const foodTaxDefaultsByRequest = new WeakMap<object, ReturnType<typeof getFoodTaxDefaults>>();
const foodTaxFor = async (parent: FoodTaxOverride, ctx: GraphQLContext) => {
  let defaults = foodTaxDefaultsByRequest.get(ctx);
  if (!defaults) {
    defaults = getFoodTaxDefaults();
    foodTaxDefaultsByRequest.set(ctx, defaults);
  }
  return effectiveFoodTax(parent, await defaults);
};

export const venueResolvers = {
  // What the venue's orders are priced with: its own GST while it overrides,
  // otherwise Finance's default — resolved here so no client ever decides it.
  VenueFoodOrdering: {
    tax_mode: async (parent: FoodTaxOverride, _a: unknown, ctx: GraphQLContext) => (await foodTaxFor(parent, ctx)).tax_mode,
    gst_pct: async (parent: FoodTaxOverride, _a: unknown, ctx: GraphQLContext) => (await foodTaxFor(parent, ctx)).gst_pct,
  },
  Venue: {
    // Live pods hosted at this venue. `.exec()` returns a real Promise so the
    // GraphQL executor never adopts a bare Mongoose Query twice.
    pod_count: (parent: { id?: string }) => {
      if (!parent.id) return 0;
      return PodModel.countDocuments({ venue_id: parent.id, deleted_at: null }).exec();
    },
    // The Super/Category/Sub the owner chose in the venue onboarding survey,
    // resolved from their OnboardingMeeting (kind VENUE). Names are looked up
    // from the Category catalogue (the meeting stores only ids). Used to
    // pre-fill Edit Venue when the venue itself has no category yet.
    survey_category: async (parent: { owner_user_id?: string | null }) => {
      if (!parent.owner_user_id || !Types.ObjectId.isValid(parent.owner_user_id)) return null;
      const meeting = await MeetingModel.findOne({
        user_id: new Types.ObjectId(parent.owner_user_id),
        kind: 'VENUE',
      }).select('super_category_id category_id sub_category_id');
      const superId = meeting?.super_category_id ?? null;
      const catId = meeting?.category_id ?? null;
      const subId = meeting?.sub_category_id ?? null;
      if (!superId && !catId && !subId) return null;
      const ids = [superId, catId, subId].filter(Boolean) as Types.ObjectId[];
      const cats = await CategoryModel.find({ _id: { $in: ids } }).select('name');
      const nameOf = (id: Types.ObjectId | null) =>
        id ? (cats.find((c) => String(c._id) === String(id))?.name ?? '') : '';
      return {
        super_category_id: superId ? String(superId) : null,
        category_id: catId ? String(catId) : null,
        sub_category_id: subId ? String(subId) : null,
        super_category_name: nameOf(superId),
        category_name: nameOf(catId),
        sub_category_name: nameOf(subId),
      };
    },
  },
  Query: {
    myVenue: async (_p: unknown, args: { venue_id?: string }, ctx: GraphQLContext) =>
      venueService.getMine(uid(ctx), args.venue_id),
    myVenues: async (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      venueService.listMine(uid(ctx)),
    myVenuesTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) =>
      venueService.tableMine(uid(ctx), args.query),
    venuePods: async (_p: unknown, args: { venue_id?: string | null }, ctx: GraphQLContext) =>
      venuePodsService.listForOwner(uid(ctx), args.venue_id),
    venuePodsSummary: async (_p: unknown, args: { venue_id?: string | null }, ctx: GraphQLContext) =>
      venuePodsService.summaryForOwner(uid(ctx), args.venue_id),
    venueRegistrationConfig: async () => venueService.registrationConfig(),
    venues: async (_p: unknown, args: { status?: string }, ctx: GraphQLContext) => {
      requireRole(ctx, VENUE_READ);
      return venueService.list({ status: args.status });
    },
    venuesTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, VENUE_READ);
      return venueService.table(args.query);
    },
    venue: async (_p: unknown, args: { venue_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, VENUE_READ);
      return venueService.getById(args.venue_doc_id);
    },
    publicVenues: async (
      _p: unknown,
      args: {
        location_id?: string;
        search?: string;
        super_category_id?: string;
        category_id?: string;
        sub_category_id?: string;
      }
    ) => venueService.publicList(args),
    publicVenue: async (_p: unknown, args: { venue_id: string }) =>
      venueService.getPublicById(args.venue_id),
    matchingVenues: async (
      _p: unknown,
      args: { location_id: string; locality?: string; super_category_id?: string; category_id?: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ['SUPER_ADMIN', 'CITY_ADMIN']);
      return venueService.findMatchingForClub({
        location_id: args.location_id,
        locality: args.locality ?? null,
        super_category_id: args.super_category_id ?? null,
        category_id: args.category_id ?? null,
      });
    },
  },
  Mutation: {
    submitVenueStep1: async (_p: unknown, args: { input: any; venue_id?: string }, ctx: GraphQLContext) =>
      venueService.submitStep1(uid(ctx), args.input, args.venue_id),
    submitVenueStep2: async (_p: unknown, args: { input: any; venue_id?: string }, ctx: GraphQLContext) =>
      venueService.submitStep2(uid(ctx), args.input, args.venue_id),
    submitVenueStep3: async (_p: unknown, args: { input: any; venue_id?: string }, ctx: GraphQLContext) =>
      venueService.submitStep3(uid(ctx), args.input, args.venue_id),
    submitVenueFinal: async (_p: unknown, args: { venue_id?: string }, ctx: GraphQLContext) =>
      venueService.submitFinal(uid(ctx), args.venue_id),
    // The owner, or a Venues console editor (the record's Food Menu tab) — who
    // may also change a saved GST number. Ownership is checked in the service.
    updateApprovedVenue: async (_p: unknown, args: { venue_id: string; input: any }, ctx: GraphQLContext) =>
      venueService.updateApproved(uid(ctx), args.venue_id, args.input, !!ctx.user && hasRole(ctx.user, VENUE_EDIT)),
    approveVenue: async (
      _p: unknown,
      args: { venue_doc_id: string; notes?: string; tags?: string[] },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, VENUE_GOVERN);
      return venueService.approve(args.venue_doc_id, args.notes, args.tags);
    },
    rejectVenue: async (
      _p: unknown,
      args: { venue_doc_id: string; notes: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, VENUE_GOVERN);
      return venueService.reject(args.venue_doc_id, args.notes);
    },
    adminCreateVenue: async (
      _p: unknown,
      args: { owner_user_id: string; step1: any; step2: any; step3: any; submit?: boolean },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, VENUE_EDIT);
      return venueService.adminCreate({
        ownerUserId: args.owner_user_id,
        step1: args.step1,
        step2: args.step2,
        step3: args.step3,
        submit: args.submit,
      });
    },
    adminUpdateVenue: async (
      _p: unknown,
      args: { venue_doc_id: string; step1: any; step2: any; step3: any; status?: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, VENUE_EDIT);
      // The status is an APPROVAL, not a detail: a console-role editor may fix a
      // venue's address but may not decide that it is live.
      if (args.status && !(ctx.user && hasRole(ctx.user, VENUE_GOVERN))) {
        throw new GraphQLError('You cannot change a venue review status', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      return venueService.adminUpdate(args.venue_doc_id, {
        step1: args.step1,
        step2: args.step2,
        step3: args.step3,
        status: args.status,
      });
    },
    setVenueActive: async (
      _p: unknown,
      args: { venue_doc_id: string; active: boolean },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, VENUE_GOVERN);
      return venueService.setActive(args.venue_doc_id, args.active);
    },
    setVenueHostRequestLimit: async (
      _p: unknown,
      args: { venue_doc_id: string; limit?: number | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, VENUE_GOVERN);
      return venueService.setHostRequestLimit(args.venue_doc_id, args.limit ?? null);
    },
    setVenueDeductions: async (
      _p: unknown,
      args: { venue_doc_id: string; venue_share_pct: number; venue_commission_pct: number },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, VENUE_FINANCE);
      return venueService.setDeductions(args.venue_doc_id, args.venue_share_pct, args.venue_commission_pct);
    },
    setVenueCancellationTrigger: async (
      _p: unknown,
      args: { venue_doc_id: string; trigger_hours: number; refund_tiers: unknown[] },
      ctx: GraphQLContext
    ) => {
      // Same gate as the deductions above it: it sits in the same review panel
      // and, like them, decides what money leaves Duncit.
      requireRole(ctx, VENUE_FINANCE);
      return venueService.setCancellationTrigger(
        args.venue_doc_id,
        args.trigger_hours,
        args.refund_tiers
      );
    },
    updateVenueSettings: async (
      _p: unknown,
      args: { venue_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      const userId = uid(ctx);
      const isAdmin = !!ctx.user && hasRole(ctx.user, VENUE_EDIT);
      // The same input carries the auto-cancel trigger and refund ladder; only
      // the callers setVenueCancellationTrigger admits may actually move them.
      const canSetAutoCancel = !!ctx.user && hasRole(ctx.user, VENUE_FINANCE);
      return venueService.updateSettings(userId, isAdmin, args.venue_doc_id, args.input, canSetAutoCancel);
    },
    // Partner-facing like the other myVenue* entries: ownership of the venue the
    // pod is booked at is enforced inside the service, so no role gate here.
    venueCancelPod: async (_p: unknown, args: { pod_id: string; reason: string }, ctx: GraphQLContext) =>
      podService.venueCancelPod(args.pod_id, uid(ctx), args.reason),
    deleteVenue: async (
      _p: unknown,
      args: { venue_doc_id: string; email: string; password: string },
      ctx: GraphQLContext
    ) => {
      // Developer-only permanent delete, re-confirmed with the caller's own
      // email + password (this cannot be undone).
      requireRole(ctx, DEVELOPER_DELETE);
      await userService.assertPasswordConfirmation(uid(ctx), args.email, args.password);
      return venueService.deleteVenue(args.venue_doc_id);
    },
  },
};
