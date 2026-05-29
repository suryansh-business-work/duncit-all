import { policyService } from './policy.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

// Policy management moved from the admin panel to the Legal portal, so writes
// are gated to legal roles (SUPER_ADMIN retains access). Public read paths
// (publicPolicies / policyBySlug) stay open for the website + app.
const ADMIN_RW = ['SUPER_ADMIN', 'LEGAL_MANAGER'];

export const policyResolvers = {
  Query: {
    policies: (_p: unknown, args: { filter?: any }) => policyService.list(args.filter),
    policy: (_p: unknown, args: { policy_doc_id: string }) =>
      policyService.getById(args.policy_doc_id),
    policyBySlug: (_p: unknown, args: { slug: string }) => policyService.getBySlug(args.slug),
    publicPolicies: () => policyService.publicList(),
  },
  Mutation: {
    createPolicy: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return policyService.create(args.input);
    },
    updatePolicy: (
      _p: unknown,
      args: { policy_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return policyService.update(args.policy_doc_id, args.input);
    },
    deletePolicy: (_p: unknown, args: { policy_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return policyService.remove(args.policy_doc_id);
    },
  },
};
