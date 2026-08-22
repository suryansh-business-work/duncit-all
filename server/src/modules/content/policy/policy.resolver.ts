import { GraphQLError } from 'graphql';
import { policyService } from './policy.service';
import { generatePolicyPdf } from '@services/policy/policy.pdf';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

// Policy management moved from the admin panel to the Legal portal, so writes
// are gated to legal roles (SUPER_ADMIN retains access). Public read paths
// (publicPolicies / policyBySlug) stay open for the website + app.
const ADMIN_RW = ['SUPER_ADMIN', 'LEGAL_MANAGER'];

export const policyResolvers = {
  Query: {
    policies: (_p: unknown, args: { filter?: any }) => policyService.list(args.filter),
    policiesTable: (_p: unknown, args: { query?: any }) => policyService.table(args.query),
    // Counts of who wrote what are staff data, so both stats reads are gated —
    // the same roles the Legal portal's document stats require.
    policyStats: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return policyService.stats();
    },
    policyStatsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return policyService.statsTable(args.query);
    },
    policy: (_p: unknown, args: { policy_doc_id: string }) =>
      policyService.getById(args.policy_doc_id),
    policyVersions: (_p: unknown, args: { policy_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return policyService.versions(args.policy_doc_id);
    },
    policyNotifyRecipientCount: (
      _p: unknown,
      args: { policy_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return policyService.notifyRecipientCount(args.policy_doc_id);
    },
    policyBySlug: (_p: unknown, args: { slug: string }) => policyService.getBySlug(args.slug),
    publicPolicies: () => policyService.publicList(),
    policyPdfBase64: async (_p: unknown, args: { slug: string }) => {
      const policy: any = await policyService.getBySlug(args.slug);
      if (!policy) {
        throw new GraphQLError('Policy not found', { extensions: { code: 'NOT_FOUND' } });
      }
      const pdf = await generatePolicyPdf({
        brand: 'Duncit',
        title: policy.title,
        content_html: policy.content || '',
        updated_at: policy.updated_at,
      });
      return pdf.toString('base64');
    },
  },
  Mutation: {
    createPolicy: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const actor = requireRole(ctx, ADMIN_RW);
      return policyService.create(actor.id, args.input);
    },
    updatePolicy: (
      _p: unknown,
      args: { policy_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      // The acting user is passed down so the version snapshot records WHO
      // replaced the wording — a history that cannot name an editor answers
      // half the question an auditor is asking.
      const actor = requireRole(ctx, ADMIN_RW);
      return policyService.update(actor.id, args.policy_doc_id, args.input);
    },
    notifyPolicyAcceptedUsers: async (
      _p: unknown,
      args: { policy_doc_id: string; summary?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return policyService.notifyPolicyAcceptedUsers(
        args.policy_doc_id,
        String(args.summary ?? '').trim()
      );
    },
    deletePolicy: (_p: unknown, args: { policy_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return policyService.remove(args.policy_doc_id);
    },
    backfillPolicyIds: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return policyService.backfillIds();
    },
  },
};
