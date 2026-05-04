import { GraphQLError } from 'graphql';
import { podMemberService } from './podMember.service';
import type { GraphQLContext } from '../../context';

function requireUser(ctx: GraphQLContext) {
  if (!ctx.user) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return ctx.user.id;
}

export const podMemberResolvers = {
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
  },
};
