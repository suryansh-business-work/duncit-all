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
    emailFragment: (_p: unknown, args: { category: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailFragmentService.byCategory(args.category);
    },
  },
  Mutation: {
    updateEmailFragment: (
      _p: unknown,
      args: { category: string; input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailFragmentService.update(args.category, args.input);
    },
    resetEmailFragment: (_p: unknown, args: { category: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailFragmentService.reset(args.category);
    },
  },
};
