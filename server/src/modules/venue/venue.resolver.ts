import { GraphQLError } from 'graphql';
import { venueService } from './venue.service';
import type { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/rbac';

const ADMIN_REVIEW = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];

function uid(ctx: GraphQLContext) {
  if (!ctx.user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  return ctx.user.id;
}

export const venueResolvers = {
  Query: {
    myVenue: async (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      venueService.getMine(uid(ctx)),
    myVenues: async (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      venueService.listMine(uid(ctx)),
    venues: async (_p: unknown, args: { status?: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_REVIEW);
      return venueService.list({ status: args.status });
    },
    venue: async (_p: unknown, args: { venue_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_REVIEW);
      return venueService.getById(args.venue_doc_id);
    },
    publicVenues: async () => venueService.list({ status: 'APPROVED' }),
  },
  Mutation: {
    submitVenueStep1: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) =>
      venueService.submitStep1(uid(ctx), args.input),
    submitVenueStep2: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) =>
      venueService.submitStep2(uid(ctx), args.input),
    submitVenueStep3: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) =>
      venueService.submitStep3(uid(ctx), args.input),
    submitVenueFinal: async (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      venueService.submitFinal(uid(ctx)),
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
    deleteVenue: async (
      _p: unknown,
      args: { venue_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_REVIEW);
      return venueService.deleteVenue(args.venue_doc_id);
    },
  },
};
