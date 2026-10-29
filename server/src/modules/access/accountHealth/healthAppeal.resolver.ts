import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { healthAppealService } from './healthAppeal.service';

const LEGAL_ROLES = ['SUPER_ADMIN', 'LEGAL_MANAGER'];

interface DecisionArgs {
  id: string;
  note?: string | null;
}

export const healthAppealResolvers = {
  Query: {
    healthAppealsTable: (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, LEGAL_ROLES);
      return healthAppealService.table(args.query);
    },
  },
  Mutation: {
    // Any signed-in person, but only for a deduction on their own account or
    // venue — the service checks the deduction's owner against the session.
    appealHealthAdjustment: (
      _p: unknown,
      args: { input: { adjustment_id: string; reason: string; message: string } },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return healthAppealService.submit(user.id, args.input);
    },
    acceptHealthAppeal: (_p: unknown, args: DecisionArgs, ctx: GraphQLContext) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return healthAppealService.accept(user.id, args.id, args.note);
    },
    denyHealthAppeal: (_p: unknown, args: DecisionArgs, ctx: GraphQLContext) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return healthAppealService.deny(user.id, args.id, args.note);
    },
  },
};
