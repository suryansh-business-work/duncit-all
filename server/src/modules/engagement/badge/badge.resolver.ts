import { badgeService } from './badge.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { GraphQLError } from 'graphql';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];

function requireUser(ctx: GraphQLContext) {
  if (!ctx.user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  return ctx.user.id;
}

export const badgeResolvers = {
  Query: {
    badges: async (_p: unknown, args: { is_active?: boolean }) =>
      badgeService.list({ is_active: args.is_active }),
    badge: async (_p: unknown, args: { badge_doc_id: string }) =>
      badgeService.getById(args.badge_doc_id),
    myBadges: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const uid = requireUser(ctx);
      return badgeService.listForUser(uid);
    },
    userBadges: async (_p: unknown, args: { user_id: string }) =>
      badgeService.listForUser(args.user_id),
  },
  Mutation: {
    createBadge: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return badgeService.create(args.input);
    },
    updateBadge: async (
      _p: unknown,
      args: { badge_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return badgeService.update(args.badge_doc_id, args.input);
    },
    deleteBadge: async (_p: unknown, args: { badge_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return badgeService.remove(args.badge_doc_id);
    },
    awardBadgeManually: async (
      _p: unknown,
      args: { user_id: string; badge_doc_id: string; reason?: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return badgeService.awardManually(args.user_id, args.badge_doc_id, args.reason);
    },
    revokeBadge: async (
      _p: unknown,
      args: { user_id: string; badge_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return badgeService.revoke(args.user_id, args.badge_doc_id);
    },
  },
};
