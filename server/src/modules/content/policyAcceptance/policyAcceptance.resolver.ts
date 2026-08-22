import { policyAcceptanceService } from './policyAcceptance.service';
import type { PolicyAcceptanceSurface } from './policyAcceptance.model';
import type { TableQueryInput } from '@utils/table-query';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';

// The acceptance log is the other half of the Legal portal's policy screen, so
// it is gated to the same roles policy.resolver already uses for its writes.
const LEGAL_RW = ['SUPER_ADMIN', 'LEGAL_MANAGER'];

export const policyAcceptanceResolvers = {
  Query: {
    signupPolicies: () => policyAcceptanceService.signupPolicies(),
    myPendingPolicies: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      policyAcceptanceService.pending(requireAuth(ctx).id),
    policyAcceptancesTable: (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, LEGAL_RW);
      return policyAcceptanceService.table(args.query);
    },
    policyAcceptanceDetail: (
      _p: unknown,
      args: { acceptance_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, LEGAL_RW);
      return policyAcceptanceService.detail(args.acceptance_id);
    },
  },
  Mutation: {
    acceptPolicies: (
      _p: unknown,
      args: { policy_ids: string[]; surface?: PolicyAcceptanceSurface | null },
      ctx: GraphQLContext
    ) =>
      policyAcceptanceService.accept(
        requireAuth(ctx).id,
        args.policy_ids,
        args.surface ?? 'UNKNOWN'
      ),
  },
};
