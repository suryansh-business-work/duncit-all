import { GraphQLError } from 'graphql';
import { hostService } from './host.service';
import { userService } from '@modules/access/user/user.service';
import type { GraphQLContext } from '@context';
import { hasRole, requireRole } from '@middleware/rbac';
import {
  consoleEditors,
  consoleGovernors,
  consoleReaders,
} from '@modules/portals/console-access';

/**
 * Reading and editing a host's own details also belongs to whoever was granted
 * the hosts console (`ALL_HOSTS_ACCESS`); approving one, setting its commission
 * and pausing it do NOT — see `console-access.ts`.
 */
const HOST_READ = consoleReaders('HOST');
const HOST_EDIT = consoleEditors('HOST');
const HOST_GOVERN = consoleGovernors('HOST');
// Permanent hard-delete is a developer-only action.
const DEVELOPER_DELETE = ['SUPER_ADMIN', 'DEVELOPERS_MANAGER'];

function uid(ctx: GraphQLContext) {
  if (!ctx.user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  return ctx.user.id;
}

export const hostResolvers = {
  // Field resolver, not part of toPub: it costs a meeting + category lookup per
  // host, so only the single-host Review query pays for it.
  Host: {
    survey_category: (parent: { user_id: string }) => hostService.surveyCategoryForUser(parent.user_id),
  },
  Query: {
    myHost: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => hostService.getMine(uid(ctx)),
    hosts: async (_p: unknown, args: { status?: string }, ctx: GraphQLContext) => {
      requireRole(ctx, HOST_READ);
      return hostService.list({ status: args.status }, { withCommission: true });
    },
    hostsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, HOST_READ);
      return hostService.table(args.query);
    },
    hostByUser: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, HOST_READ);
      return hostService.getByUser(args.user_id);
    },
    host: async (_p: unknown, args: { host_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, HOST_READ);
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
      requireRole(ctx, HOST_GOVERN);
      return hostService.approve(args.host_doc_id, args.notes, args.tags);
    },
    rejectHost: async (
      _p: unknown,
      args: { host_doc_id: string; notes: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, HOST_GOVERN);
      return hostService.reject(args.host_doc_id, args.notes);
    },
    adminCreateHost: async (
      _p: unknown,
      args: { target_user_id: string; step1: any; step2: any; step3: any; submit?: boolean },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, HOST_EDIT);
      return hostService.adminCreate({
        targetUserId: args.target_user_id,
        step1: args.step1,
        step2: args.step2,
        step3: args.step3,
        submit: args.submit,
      });
    },
    adminSetHostCategories: async (
      _p: unknown,
      args: { host_doc_id: string; categories: any[] },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, HOST_EDIT);
      return hostService.adminSetCategories(args.host_doc_id, args.categories);
    },
    adminUpdateHost: async (
      _p: unknown,
      args: { host_doc_id: string; step1: any; step2: any; step3: any; status?: string; categories?: any[] },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, HOST_EDIT);
      // The status is an APPROVAL, not a detail: a console-role editor may fix a
      // host's address but may not decide that they are approved.
      if (args.status && !(ctx.user && hasRole(ctx.user, HOST_GOVERN))) {
        throw new GraphQLError('You cannot change a host review status', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
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
      requireRole(ctx, HOST_GOVERN);
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
