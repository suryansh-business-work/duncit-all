import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import { accountHealthService } from './accountHealth.service';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const accountHealthResolvers = {
  Query: {
    myAccountHealth: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return accountHealthService.getMyAccountHealth(user.id);
    },
    myVenueHealth: (_p: unknown, args: { venue_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return accountHealthService.getMyVenueHealth(user.id, args.venue_id);
    },
    userAccountHealth: (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return accountHealthService.getUserAccountHealth(args.user_id);
    },
    venueHealth: (_p: unknown, args: { venue_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return accountHealthService.getVenueHealth(args.venue_id);
    },
  },
  Mutation: {
    adjustHealth: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ADMIN_ROLES);
      return accountHealthService.adjust(user.id, args.input);
    },
    editAdjustment: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ADMIN_ROLES);
      return accountHealthService.editAdjustment(user.id, args.input);
    },
    deleteAdjustment: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return accountHealthService.deleteAdjustment(args.id);
    },
  },
};
