import type { GraphQLContext } from '../../context';
import { requireAuth, requireRole } from '../../middleware/rbac';
import { bouncerService } from './bouncer.service';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const bouncerResolvers = {
  Query: {
    bouncerSupportTarget: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return bouncerService.getSupportTarget();
    },
    bouncerSosAlerts: (_p: unknown, args: { status?: any; limit?: number }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return bouncerService.listSos(args.status, args.limit ?? 100);
    },
    bouncerCallbackRequests: (
      _p: unknown,
      args: { status?: any; limit?: number },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return bouncerService.listCallbacks(args.status, args.limit ?? 100);
    },
    bouncerFeedback: (_p: unknown, args: { limit?: number }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return bouncerService.listFeedback(args.limit ?? 100);
    },
    myActiveBouncerSos: (_p: unknown, args: { pod_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return bouncerService.getMyActiveSos(user.id, args.pod_id);
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
    markBouncerCallbackContacted: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ADMIN_ROLES);
      return bouncerService.markCallbackContacted(user.id, args.id);
    },
    closeBouncerCallback: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ADMIN_ROLES);
      return bouncerService.closeCallback(user.id, args.id);
    },
    submitBouncerFeedback: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return bouncerService.submitFeedback(user.id, args.input);
    },
  },
};
