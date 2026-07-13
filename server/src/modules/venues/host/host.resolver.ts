import { GraphQLError } from 'graphql';
import { hostService } from './host.service';
import { userService } from '@modules/access/user/user.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

// Onboarding console (Onboarded Hosts) reviews and configures hosts too.
const ADMIN_REVIEW = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'ONBOARDING_MANAGER'];
// Permanent hard-delete is a developer-only action.
const DEVELOPER_DELETE = ['SUPER_ADMIN', 'DEVELOPERS_MANAGER'];

function uid(ctx: GraphQLContext) {
  if (!ctx.user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  return ctx.user.id;
}

export const hostResolvers = {
  Query: {
    myHost: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => hostService.getMine(uid(ctx)),
    hosts: async (_p: unknown, args: { status?: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_REVIEW);
      return hostService.list({ status: args.status }, { withCommission: true });
    },
    host: async (_p: unknown, args: { host_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_REVIEW);
      return hostService.getById(args.host_doc_id);
    },
    // Unauthenticated discovery query — MUST stay redacted. See
    // hostService.redactForPublic: it strips aadhar/PAN/bank/police-doc/DOB/phone,
    // which this used to leak to anyone who asked.
    publicHosts: async () =>
      hostService.list({ status: 'APPROVED', activeOnly: true }, { redacted: true }),
  },
  Mutation: {
    submitHostStep1: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) =>
      hostService.submitStep1(uid(ctx), args.input),
    submitHostStep2: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) =>
      hostService.submitStep2(uid(ctx), args.input),
    submitHostStep3: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) =>
      hostService.submitStep3(uid(ctx), args.input),
    submitHostFinal: async (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      hostService.submitFinal(uid(ctx)),
    withdrawHostApplication: async (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      hostService.withdrawMine(uid(ctx)),
    approveHost: async (
      _p: unknown,
      args: { host_doc_id: string; notes?: string; tags?: string[] },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_REVIEW);
      return hostService.approve(args.host_doc_id, args.notes, args.tags);
    },
    rejectHost: async (
      _p: unknown,
      args: { host_doc_id: string; notes: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_REVIEW);
      return hostService.reject(args.host_doc_id, args.notes);
    },
    adminCreateHost: async (
      _p: unknown,
      args: { target_user_id: string; step1: any; step2: any; step3: any; submit?: boolean },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_REVIEW);
      return hostService.adminCreate({
        targetUserId: args.target_user_id,
        step1: args.step1,
        step2: args.step2,
        step3: args.step3,
        submit: args.submit,
      });
    },
    adminUpdateHost: async (
      _p: unknown,
      args: { host_doc_id: string; step1: any; step2: any; step3: any; status?: string; categories?: any[] },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_REVIEW);
      return hostService.adminUpdate(args.host_doc_id, {
        step1: args.step1,
        step2: args.step2,
        step3: args.step3,
        status: args.status,
        categories: args.categories,
      });
    },
    setHostActive: async (
      _p: unknown,
      args: { host_doc_id: string; active: boolean },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_REVIEW);
      return hostService.setActive(args.host_doc_id, args.active);
    },
    deleteHost: async (
      _p: unknown,
      args: { host_doc_id: string; email: string; password: string },
      ctx: GraphQLContext
    ) => {
      // Developer-only permanent delete, re-confirmed with the caller's own
      // email + password (this cannot be undone).
      requireRole(ctx, DEVELOPER_DELETE);
      await userService.assertPasswordConfirmation(uid(ctx), args.email, args.password);
      return hostService.deleteHost(args.host_doc_id);
    },
  },
};
