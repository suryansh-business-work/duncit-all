import { GraphQLError } from 'graphql';
import { podMemberService } from './podMember.service';
import { podService } from '@modules/pods/pod/pod.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

// Finance/admin roles that may view the Backout Refunds list.
const ADMIN_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];

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
  },
  BackoutRefundRequest: {
    // The pod may have been soft-deleted after the backout — still show it.
    pod: async (parent: { pod_id: string }) =>
      podService.getById(parent.pod_id, { includeDeleted: true }),
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
    referralLookup: async (_p: unknown, args: { token: string }) =>
      podMemberService.lookupReferral(args.token),
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
      args: { pod_doc_id: string; referral_token?: string | null },
      ctx: GraphQLContext
    ) => {
      const uid = requireUser(ctx);
      return podMemberService.joinFree(args.pod_doc_id, uid, args.referral_token);
    },
    backoutPod: async (_p: unknown, args: { pod_doc_id: string }, ctx: GraphQLContext) => {
      const uid = requireUser(ctx);
      return podMemberService.backout(args.pod_doc_id, uid);
    },
    redeemPodReferral: async (_p: unknown, args: { token: string }, ctx: GraphQLContext) => {
      const uid = requireUser(ctx);
      return podMemberService.redeemReferral(args.token, uid);
    },
    rejoinPod: async (_p: unknown, args: { pod_doc_id: string }, ctx: GraphQLContext) => {
      const uid = requireUser(ctx);
      return podMemberService.rejoin(args.pod_doc_id, uid);
    },
  },
};
