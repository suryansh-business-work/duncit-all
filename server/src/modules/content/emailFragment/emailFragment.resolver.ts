import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { emailFragmentService } from './emailFragment.service';

/** The same roles that guard the templates these fragments wrap. */
const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const emailFragmentResolvers = {
  Query: {
    emailFragments: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailFragmentService.list();
    },
    emailFragment: (_p: unknown, args: { key: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailFragmentService.byKey(args.key);
    },
  },
  Mutation: {
    createEmailFragment: (
      _p: unknown,
      args: { input: Record<string, any> },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailFragmentService.create(args.input as any);
    },
    updateEmailFragment: (
      _p: unknown,
      args: { key: string; input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailFragmentService.update(args.key, args.input);
    },
    deleteEmailFragment: (_p: unknown, args: { key: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailFragmentService.remove(args.key);
    },
    resetEmailFragment: (_p: unknown, args: { key: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailFragmentService.reset(args.key);
    },
  },
};
