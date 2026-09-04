import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import { AutoPodModel } from './autoPod.model';
import { autoPodService, categoryPathOf, type AutoPodQueueScope } from './autoPod.service';
import { autoPodAudience } from './autoPod.audience';
import {
  clubClaimAutoPod,
  clubWithdrawAutoPod,
  hostAssignAutoPod,
  hostWithdrawAutoPod,
  venueAcceptAutoPod,
  venueWithdrawAutoPod,
  type HostMeetingInput,
} from './autoPod.claims';
import { CategoryModel } from '@modules/pods/category/category.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { clubAdminService } from '@modules/clubs/clubAdmin/clubAdmin.service';
import { Types } from 'mongoose';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];

const isAdminCtx = (ctx: GraphQLContext) =>
  !!ctx.user?.roles?.some((r) => ADMIN_WRITE.includes(r));

/**
 * A partner may read one Auto Pod when they could act on it or already have.
 * Admins see everything. Anyone else is refused rather than shown an offer they
 * have no standing in — the list queries are the discovery path.
 */
async function assertCanReadAutoPod(ctx: GraphQLContext, autoPodDocId: string) {
  if (isAdminCtx(ctx)) return;
  const user = requireAuth(ctx);
  if (!(await autoPodService.canRead(user.id, autoPodDocId))) {
    throw new GraphQLError('Auto Pod not found', { extensions: { code: 'NOT_FOUND' } });
  }
}

/** Has this caller (or a club of theirs) already enrolled in this Auto Pod? */
async function viewerClaimed(parent: any, ctx: GraphQLContext): Promise<boolean> {
  const userId = ctx.user?.id;
  if (!userId) return false;
  if (parent.host_claim?.user_id === userId) return true;
  if (parent.venue_claim?.owner_user_id === userId) return true;
  if (!parent.club_claim) return false;
  if (parent.club_claim.user_id === userId) return true;
  return !!(await ClubModel.exists({
    _id: parent.club_claim.club_id,
    admin_user_ids: new Types.ObjectId(userId),
  }));
}

export const autoPodResolvers = {
  AutoPod: {
    category_name: async (parent: any) => {
      const sub: any = await CategoryModel.findById(parent.sub_category_id).select('name').lean();
      return sub?.name ?? null;
    },
    category_path: (parent: any) => categoryPathOf(String(parent.sub_category_id)),
    // Attached by every list and the single-row read; a mutation's own
    // return carries no deadline (the queues re-read straight after).
    expires_at: (parent: any) => parent.expires_at ?? null,
    // Attached by the venue queue only; every other list reads null.
    venue_expires_at: (parent: any) => parent.venue_expires_at ?? null,
    // Attached by the venue and host queues; every other list reads null.
    withdraw_penalty_points: (parent: any) => parent.withdraw_penalty_points ?? null,
    viewer_claimed: (parent: any, _a: unknown, ctx: GraphQLContext) => viewerClaimed(parent, ctx),
    pod: async (parent: any) => {
      if (!parent.pod_id) return null;
      const doc = await AutoPodModel.findById(parent.id);
      return doc ? autoPodService.materializedPod(doc) : null;
    },
    expected_host_earnings: async (parent: any, _a: unknown, ctx: GraphQLContext) => {
      if (!ctx.user?.id || !parent.venue_claim) return null;
      const doc = await AutoPodModel.findById(parent.id);
      return doc ? autoPodService.expectedHostEarnings(doc, ctx.user.id) : null;
    },
    // Ticket price × the booked space's capacity — the venue's own figure,
    // never the host's payout.
    expected_venue_earnings: async (parent: any) => {
      if (!parent.venue_claim) return null;
      const doc = await AutoPodModel.findById(parent.id);
      return doc ? autoPodService.expectedVenueEarnings(doc) : null;
    },
    // The club admin's cut of the same waterfall Step 4 of Create a Pod runs.
    expected_club_earnings: async (parent: any) => {
      if (!parent.host_claim) return null;
      const doc = await AutoPodModel.findById(parent.id);
      return doc ? autoPodService.expectedClubEarnings(doc) : null;
    },
  },

  Query: {
    adminAutoPodsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return autoPodService.table(args.query);
    },

    autoPod: async (_p: unknown, args: { auto_pod_doc_id: string }, ctx: GraphQLContext) => {
      await assertCanReadAutoPod(ctx, args.auto_pod_doc_id);
      return autoPodService.getById(args.auto_pod_doc_id);
    },

    // Scope is derived from venue ownership / host approval / club membership
    // inside the service, so a caller with no such standing gets an empty list
    // rather than someone else's queue. The optional city / category arguments
    // only ever NARROW that.
    venueAutoPods: (_p: unknown, args: AutoPodQueueScope, ctx: GraphQLContext) =>
      autoPodService.listForVenue(requireAuth(ctx).id, args),

    hostAutoPods: (_p: unknown, args: AutoPodQueueScope, ctx: GraphQLContext) =>
      autoPodService.listForHost(requireAuth(ctx).id, args),

    clubAdminAutoPods: (_p: unknown, args: AutoPodQueueScope, ctx: GraphQLContext) =>
      autoPodService.listForClubAdmin(requireAuth(ctx).id, args),

    myAutoPodActionCounts: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      autoPodService.actionCounts(requireAuth(ctx).id),

    // Ownership of the venue is asserted inside; the offer must still be
    // waiting on a venue.
    autoPodVenueSlots: (
      _p: unknown,
      args: { auto_pod_doc_id: string; venue_id: string },
      ctx: GraphQLContext
    ) => autoPodService.venueSlots(requireAuth(ctx).id, args.auto_pod_doc_id, args.venue_id),

    autoPodHostProjection: async (
      _p: unknown,
      args: { auto_pod_doc_id: string; pod_amount: number; no_of_spots: number },
      ctx: GraphQLContext
    ) => {
      await assertCanReadAutoPod(ctx, args.auto_pod_doc_id);
      return autoPodService.hostProjection(
        requireAuth(ctx).id,
        args.auto_pod_doc_id,
        args.pod_amount,
        args.no_of_spots
      );
    },

    // Names, emails and phone numbers of partners — the admin's to see while
    // writing a template, nobody else's.
    autoPodAudience: (_p: unknown, args: { sub_category_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return autoPodAudience(args.sub_category_id);
    },
  },

  Mutation: {
    // Two openers, one write. Without `club_id` this is the marketplace offer
    // only a Duncit admin may post. With it, the caller is opening the offer for
    // a club they administer — membership of that club is the authorisation,
    // exactly as it is for `clubClaimAutoPod`.
    createAutoPod: async (
      _p: unknown,
      args: { input: any; club_id?: string | null },
      ctx: GraphQLContext
    ) => {
      if (!args.club_id) {
        const admin = requireRole(ctx, ADMIN_WRITE);
        return autoPodService.create(admin.id, args.input);
      }
      const actor = requireAuth(ctx);
      await clubAdminService.assertClubAdmin(actor, args.club_id);
      return autoPodService.create(actor.id, args.input, args.club_id);
    },

    updateAutoPod: (
      _p: unknown,
      args: { auto_pod_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, ADMIN_WRITE);
      return autoPodService.update(user.id, args.auto_pod_doc_id, args.input);
    },

    setAutoPodActive: (
      _p: unknown,
      args: { auto_pod_doc_id: string; is_active: boolean },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, ADMIN_WRITE);
      return autoPodService.setActive(user.id, args.auto_pod_doc_id, args.is_active);
    },

    cancelAutoPod: (
      _p: unknown,
      args: { auto_pod_doc_id: string; reason?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, ADMIN_WRITE);
      return autoPodService.cancel(user.id, args.auto_pod_doc_id, args.reason);
    },

    deleteAutoPod: (_p: unknown, args: { auto_pod_doc_id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ADMIN_WRITE);
      return autoPodService.delete(user.id, args.auto_pod_doc_id);
    },

    // Venue ownership, host capability and club membership are each asserted
    // inside the claim itself — the same rules that gate creating a pod.
    venueAcceptAutoPod: (
      _p: unknown,
      args: { auto_pod_doc_id: string; venue_id: string; slot_id: string },
      ctx: GraphQLContext
    ) =>
      venueAcceptAutoPod(
        requireAuth(ctx).id,
        args.auto_pod_doc_id,
        args.venue_id,
        args.slot_id
      ),

    hostAssignAutoPod: (
      _p: unknown,
      args: {
        auto_pod_doc_id: string;
        location_id?: string | null;
        pod_amount?: number | null;
        no_of_spots?: number | null;
        meeting?: HostMeetingInput | null;
      },
      ctx: GraphQLContext
    ) =>
      hostAssignAutoPod(
        requireAuth(ctx).id,
        args.auto_pod_doc_id,
        args.location_id,
        args.pod_amount,
        args.no_of_spots,
        args.meeting
      ),

    // Ownership of the claim is asserted inside each.
    venueWithdrawAutoPod: (_p: unknown, args: { auto_pod_doc_id: string }, ctx: GraphQLContext) =>
      venueWithdrawAutoPod(requireAuth(ctx).id, args.auto_pod_doc_id),

    hostWithdrawAutoPod: (_p: unknown, args: { auto_pod_doc_id: string }, ctx: GraphQLContext) =>
      hostWithdrawAutoPod(requireAuth(ctx).id, args.auto_pod_doc_id),

    // Membership of the CLAIMING club is what authorises this, asserted inside.
    clubWithdrawAutoPod: (_p: unknown, args: { auto_pod_doc_id: string }, ctx: GraphQLContext) =>
      clubWithdrawAutoPod(requireAuth(ctx), args.auto_pod_doc_id),

    clubClaimAutoPod: (
      _p: unknown,
      args: { auto_pod_doc_id: string; club_id: string },
      ctx: GraphQLContext
    ) => clubClaimAutoPod(requireAuth(ctx), args.auto_pod_doc_id, args.club_id),
  },
};
