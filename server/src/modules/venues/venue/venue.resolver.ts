import { GraphQLError } from 'graphql';
import { venueService } from './venue.service';
import { userService } from '@modules/access/user/user.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import type { GraphQLContext } from '@context';
import { hasRole, requireRole } from '@middleware/rbac';

// Onboarding console (Onboarded Venues) reviews and configures venues too.
const ADMIN_REVIEW = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'ONBOARDING_MANAGER'];
// Permanent hard-delete is a developer-only action (mirrors the API-key gate).
const DEVELOPER_DELETE = ['SUPER_ADMIN', 'DEVELOPERS_MANAGER'];

function uid(ctx: GraphQLContext) {
  if (!ctx.user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  return ctx.user.id;
}

export const venueResolvers = {
  Venue: {
    // Live pods hosted at this venue. `.exec()` returns a real Promise so the
    // GraphQL executor never adopts a bare Mongoose Query twice.
    pod_count: (parent: { id?: string }) => {
      if (!parent.id) return 0;
      return PodModel.countDocuments({ venue_id: parent.id, deleted_at: null }).exec();
    },
  },
  Query: {
    myVenue: async (_p: unknown, args: { venue_id?: string }, ctx: GraphQLContext) =>
      venueService.getMine(uid(ctx), args.venue_id),
    myVenues: async (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      venueService.listMine(uid(ctx)),
    venueRegistrationConfig: async () => venueService.registrationConfig(),
    venues: async (_p: unknown, args: { status?: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_REVIEW);
      return venueService.list({ status: args.status });
    },
    venue: async (_p: unknown, args: { venue_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_REVIEW);
      return venueService.getById(args.venue_doc_id);
    },
    publicVenues: async () => venueService.list({ status: 'APPROVED', activeOnly: true }),
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
    updateApprovedVenue: async (_p: unknown, args: { venue_id: string; input: any }, ctx: GraphQLContext) =>
      venueService.updateApproved(uid(ctx), args.venue_id, args.input),
    approveVenue: async (
      _p: unknown,
      args: { venue_doc_id: string; notes?: string; tags?: string[] },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_REVIEW);
      return venueService.approve(args.venue_doc_id, args.notes, args.tags);
    },
    rejectVenue: async (
      _p: unknown,
      args: { venue_doc_id: string; notes: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_REVIEW);
      return venueService.reject(args.venue_doc_id, args.notes);
    },
    adminCreateVenue: async (
      _p: unknown,
      args: { owner_user_id: string; step1: any; step2: any; step3: any; submit?: boolean },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_REVIEW);
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
      requireRole(ctx, ADMIN_REVIEW);
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
      requireRole(ctx, ADMIN_REVIEW);
      return venueService.setActive(args.venue_doc_id, args.active);
    },
    setVenueDeductions: async (
      _p: unknown,
      args: { venue_doc_id: string; venue_share_pct: number; venue_commission_pct: number },
      ctx: GraphQLContext
    ) => {
      // Finance manages deduction overrides too (Finance portal → overrides).
      requireRole(ctx, [...ADMIN_REVIEW, 'FINANCE_MANAGER']);
      return venueService.setDeductions(args.venue_doc_id, args.venue_share_pct, args.venue_commission_pct);
    },
    updateVenueSettings: async (
      _p: unknown,
      args: { venue_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      const userId = uid(ctx);
      const isAdmin = !!ctx.user && hasRole(ctx.user, ADMIN_REVIEW);
      return venueService.updateSettings(userId, isAdmin, args.venue_doc_id, args.input);
    },
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
