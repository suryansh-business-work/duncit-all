import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import { bouncerService } from './bouncer.service';

// Bouncer monitoring now lives in the Support portal, so the agent-side
// queries/mutations are gated to support roles instead of city admins.
const ADMIN_ROLES = ['SUPER_ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_USER'];

export const bouncerResolvers = {
  Query: {
    bouncerSupportTarget: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return bouncerService.getSupportTarget();
    },
    bouncerSosAlerts: (
      _p: unknown,
      args: {
        status?: any;
        search?: string;
        page?: number;
        page_size?: number;
        sort_by?: string;
        sort_dir?: string;
      },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return bouncerService.listSos({
        status: args.status,
        search: args.search,
        page: args.page,
        page_size: args.page_size,
        sort_by: args.sort_by,
        sort_dir: args.sort_dir,
      });
    },
    bouncerCallbackRequests: (
      _p: unknown,
      args: {
        status?: any;
        search?: string;
        page?: number;
        page_size?: number;
        sort_by?: string;
        sort_dir?: string;
      },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return bouncerService.listCallbacks({
        status: args.status,
        search: args.search,
        page: args.page,
        page_size: args.page_size,
        sort_by: args.sort_by,
        sort_dir: args.sort_dir,
      });
    },
    bouncerSosAlert: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return bouncerService.getSos(args.id);
    },
    bouncerCallbackRequest: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return bouncerService.getCallback(args.id);
    },
    bouncerFeedback: (_p: unknown, args: { limit?: number }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return bouncerService.listFeedback(args.limit ?? 100);
    },
    myActiveBouncerSos: (_p: unknown, args: { pod_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return bouncerService.getMyActiveSos(user.id, args.pod_id);
    },
    myCallbackRequests: (_p: unknown, args: { limit?: number }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return bouncerService.listMyCallbacks(user.id, args.limit ?? 100);
    },
    myPendingPodFeedback: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return bouncerService.getPendingPodFeedback(user.id);
    },
  },
  Mutation: {
    raiseBouncerSos: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return bouncerService.raiseSos(user.id, args.input);
    },
    acknowledgeBouncerSos: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ADMIN_ROLES);
      return bouncerService.acknowledgeSos(user.id, args.id);
    },
    resolveBouncerSos: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ADMIN_ROLES);
      return bouncerService.resolveSos(user.id, args.id);
    },
    requestBouncerCallback: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return bouncerService.requestCallback(user.id, args.input);
    },
    markBouncerCallbackContacted: (
      _p: unknown,
      args: { id: string; duration_seconds?: number | null; conclusion?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, ADMIN_ROLES);
      return bouncerService.markCallbackContacted(user.id, args.id, {
        duration_seconds: args.duration_seconds,
        conclusion: args.conclusion,
      });
    },
    closeBouncerCallback: (
      _p: unknown,
      args: { id: string; duration_seconds?: number | null; conclusion?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, ADMIN_ROLES);
      return bouncerService.closeCallback(user.id, args.id, {
        duration_seconds: args.duration_seconds,
        conclusion: args.conclusion,
      });
    },
    submitBouncerFeedback: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return bouncerService.submitFeedback(user.id, args.input);
    },
  },
};
