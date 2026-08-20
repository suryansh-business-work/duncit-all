import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import { AutoPodModel } from './autoPod.model';
import { autoPodService } from './autoPod.service';
import {
  clubClaimAutoPod,
  hostAssignAutoPod,
  venueAcceptAutoPod,
} from './autoPod.claims';
import { CategoryModel } from '@modules/pods/category/category.model';
import { ClubModel } from '@modules/clubs/club/club.model';
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
  const rows = await Promise.all([
    autoPodService.listForVenue(user.id),
    autoPodService.listForHost(user.id),
    autoPodService.listForClubAdmin(user.id),
  ]);
  const visible = rows.flat().some((row) => row?.id === autoPodDocId);
  if (!visible) {
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
    // rather than someone else's queue.
    venueAutoPods: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      autoPodService.listForVenue(requireAuth(ctx).id),

    hostAutoPods: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      autoPodService.listForHost(requireAuth(ctx).id),

    clubAdminAutoPods: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      autoPodService.listForClubAdmin(requireAuth(ctx).id),

    myAutoPodActionCounts: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      autoPodService.actionCounts(requireAuth(ctx).id),
  },

  Mutation: {
    createAutoPod: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ADMIN_WRITE);
      return autoPodService.create(user.id, args.input);
    },

    updateAutoPod: (
      _p: unknown,
      args: { auto_pod_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, ADMIN_WRITE);
      return autoPodService.update(user.id, args.auto_pod_doc_id, args.input);
    },

    cancelAutoPod: (
      _p: unknown,
      args: { auto_pod_doc_id: string; reason?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, ADMIN_WRITE);
      return autoPodService.cancel(user.id, args.auto_pod_doc_id, args.reason);
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
      args: { auto_pod_doc_id: string },
      ctx: GraphQLContext
    ) => hostAssignAutoPod(requireAuth(ctx).id, args.auto_pod_doc_id),

    clubClaimAutoPod: (
      _p: unknown,
      args: { auto_pod_doc_id: string; club_id: string },
      ctx: GraphQLContext
    ) => clubClaimAutoPod(requireAuth(ctx), args.auto_pod_doc_id, args.club_id),
  },
};
