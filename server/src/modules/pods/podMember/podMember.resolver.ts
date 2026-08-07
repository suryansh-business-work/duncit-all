import { GraphQLError } from 'graphql';
import { participationForMembership } from './membershipTimeline.service';
import { podMemberService } from './podMember.service';
import { podService } from '@modules/pods/pod/pod.service';
import type { GraphQLContext } from '@context';
import { hasRole, requireRole } from '@middleware/rbac';

// Finance/admin roles that may view the Backout Refunds list.
const ADMIN_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];
// Roles that may read a pod's attendee contact list (Admin + Finance portals).
const ATTENDEE_ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'FINANCE_MANAGER'];

/**
 * Whose story a caller may read.
 *
 * Their own, or anybody's if they run the place. PodMember is returned by
 * queries that accept no token at all, so without this the DUN-BKO ids and
 * refund amounts of every attendee on any pod were one query away.
 */
function mayReadParticipation(ctx: GraphQLContext, ownerId: string): boolean {
  if (!ctx.user) return false;
  if (String(ctx.user.id) === String(ownerId)) return true;
  return hasRole(ctx.user, ATTENDEE_ADMIN_ROLES);
}

function requireUser(ctx: GraphQLContext) {
  if (!ctx.user) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return ctx.user.id;
}

export const podMemberResolvers = {
  PodMember: {
    // Pod History must still show a booking whose pod was soft-deleted.
    pod: async (parent: { pod_id: string }) =>
      podService.getById(parent.pod_id, { includeDeleted: true }),
    /*
      Resolved per booking, not folded into the row.

      A list of bookings needs none of this; a timeline needs all of it. Keeping
      it as one field means only the screen that draws a timeline pays for it,
      and it pays once — asking for the ticket and the pod per sub-field cost a
      few hundred round trips on a long history.

      Guarded, because PodMember is reachable from queries that take no token
      (podMembers, referralLookup) and this object carries DUN-BKO ids, refund
      amounts and door-scan attendance for whoever asks.
    */
    participation: async (
      parent: { id: string; pod_id: string; user_id: string; joined_at?: string; payment_id?: string | null },
      _args: unknown,
      ctx: GraphQLContext,
    ) => {
      if (!mayReadParticipation(ctx, parent.user_id)) return null;
      return participationForMembership({
        memberId: parent.id,
        podId: parent.pod_id,
        joinedAt: parent.joined_at ?? null,
        paymentId: parent.payment_id ?? null,
      });
    },
  },
  BackoutRefundRequest: {
    // The pod may have been soft-deleted after the backout — still show it.
    pod: async (parent: { pod_id: string }) =>
      podService.getById(parent.pod_id, { includeDeleted: true }),
    /*
      The booking this request belongs to, not just the request.

      Finance reads one branch of a longer story — a second attempt only makes
      sense next to the first, and a partial backout only makes sense next to
      the seats that stayed. Resolved as a field so the list, which draws none
      of it, does not pay for it.
    */
    participation: async (parent: {
      member_id?: string | null;
      pod_id: string;
      joined_at: string | null;
      payment_id?: string | null;
    }) =>
      participationForMembership({
        memberId: parent.member_id,
        podId: parent.pod_id,
        joinedAt: parent.joined_at,
        paymentId: parent.payment_id,
      }),
  },
  AdminPodAttendee: {
    participation: async (parent: {
      member_id?: string | null;
      pod_id: string;
      joined_at: string | null;
      payment_id?: string | null;
    }) =>
      participationForMembership({
        memberId: parent.member_id,
        podId: parent.pod_id,
        joinedAt: parent.joined_at,
        paymentId: parent.payment_id,
      }),
  },
  Query: {
    myPodMemberships: async (_p: unknown, args: { status?: string }, ctx: GraphQLContext) => {
      const uid = requireUser(ctx);
      return podMemberService.listMine(uid, args.status);
    },
    podMembershipState: async (
      _p: unknown,
      args: { pod_doc_id: string },
      ctx: GraphQLContext
    ) => {
      return podMemberService.getState(args.pod_doc_id, ctx.user?.id ?? null);
    },
    podMembers: async (_p: unknown, args: { pod_doc_id: string; status?: string }) =>
      podMemberService.listForPod(args.pod_doc_id, args.status),
    // Public pod information, like the attendee list it labels. Deliberately NOT
    // served off `podMembers`, which returns payment ids, referral tokens and
    // refund state that nobody rendering an avatar row should receive.
    podAttendeeSeats: async (_p: unknown, args: { pod_doc_id: string }) =>
      podMemberService.listAttendeeSeats(args.pod_doc_id),
    podSpotFills: async (_p: unknown, args: { pod_doc_id: string }) =>
      podMemberService.listSpotFills(args.pod_doc_id),
    adminPodAttendees: async (_p: unknown, args: { pod_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ATTENDEE_ADMIN_ROLES);
      return podMemberService.listAdminAttendees(args.pod_doc_id);
    },
    referralLookup: async (_p: unknown, args: { token: string }) =>
      podMemberService.lookupReferral(args.token),
    bookingDetail: async (_p: unknown, args: { booking_id: string }, ctx: GraphQLContext) => {
      const uid = requireUser(ctx);
      return podMemberService.getBookingForUser(args.booking_id, uid);
    },
    backoutRefundRequests: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return podMemberService.listBackoutRefunds();
    },
    backoutRefundRequestsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return podMemberService.tableBackoutRefunds(args.query);
    },
    backoutRefundRequest: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return podMemberService.getBackoutRefund(args.id);
    },
  },
  Mutation: {
    joinFreePod: async (
      _p: unknown,
      args: { pod_doc_id: string; referral_token?: string | null; seats?: number | null },
      ctx: GraphQLContext
    ) => {
      const uid = requireUser(ctx);
      return podMemberService.joinFree(args.pod_doc_id, uid, args.referral_token, args.seats ?? 1);
    },
    backoutPod: async (
      _p: unknown,
      args: { pod_doc_id: string; seats?: number | null },
      ctx: GraphQLContext
    ) => {
      const uid = requireUser(ctx);
      return podMemberService.backout(args.pod_doc_id, uid, args.seats);
    },
    cancelBackoutPod: async (
      _p: unknown,
      args: { pod_doc_id: string; backout_id?: string | null },
      ctx: GraphQLContext
    ) => {
      const uid = requireUser(ctx);
      return podMemberService.cancelBackout(args.pod_doc_id, uid, args.backout_id);
    },
    redeemPodReferral: async (_p: unknown, args: { token: string }, ctx: GraphQLContext) => {
      const uid = requireUser(ctx);
      return podMemberService.redeemReferral(args.token, uid);
    },
    rejoinPod: async (_p: unknown, args: { pod_doc_id: string }, ctx: GraphQLContext) => {
      const uid = requireUser(ctx);
      return podMemberService.rejoin(args.pod_doc_id, uid);
    },
    processBackoutRefund: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return podMemberService.processBackoutRefund(args.id);
    },
  },
};
