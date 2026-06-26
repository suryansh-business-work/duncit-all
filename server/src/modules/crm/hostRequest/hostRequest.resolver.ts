import { hostRequestService } from './hostRequest.service';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole, hasRole } from '@middleware/rbac';

// Same onboarding role set survey.resolver.ts uses for its authoring queries.
const ONBOARDING_REVIEW = ['SUPER_ADMIN', 'ONBOARDING_MANAGER'];

const reviewerFrom = (user: { id: string; email?: string | null }) => ({
  id: user.id,
  name: user.email ?? '',
});

export const hostRequestResolvers = {
  Query: {
    myHostRequest: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return hostRequestService.myActive(user.id);
    },
    myHostRequests: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return hostRequestService.listMine(user.id);
    },
    myHostTakenCategoryIds: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return hostRequestService.takenCategoryIds(user.id);
    },
    hostRequests: (_p: unknown, args: { status?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, ONBOARDING_REVIEW);
      return hostRequestService.list({ status: args.status ?? null });
    },
    hostRequest: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ONBOARDING_REVIEW);
      return hostRequestService.getById(args.id);
    },
  },
  Mutation: {
    submitHostRequest: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return hostRequestService.submit(user.id, args.input, { isHost: hasRole(user, ['HOST']) });
    },
    acknowledgeHostRequest: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ONBOARDING_REVIEW);
      return hostRequestService.acknowledge(args.id, reviewerFrom(user));
    },
    approveHostRequest: (_p: unknown, args: { id: string; notes?: string | null }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ONBOARDING_REVIEW);
      return hostRequestService.approve(args.id, reviewerFrom(user), args.notes);
    },
    rejectHostRequest: (_p: unknown, args: { id: string; notes: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ONBOARDING_REVIEW);
      return hostRequestService.reject(args.id, reviewerFrom(user), args.notes);
    },
  },
};
