import { approvalService } from './approval.service';
import type { ApprovalStatus } from './approval.model';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

// The Admin console reviews cross-portal requests (e.g. ecomm change requests).
// Onboarding-meeting approvals are decided in the Onboarding console itself.
const APPROVAL_REVIEW = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];
// The Products portal raises + views ecomm change requests.
const ECOMM_PORTAL = ['SUPER_ADMIN', 'CITY_ADMIN', 'PRODUCTS_MANAGER'];

export const approvalResolvers = {
  Query: {
    approvalRequests: (
      _p: unknown,
      args: { status?: ApprovalStatus | null; type?: string | null },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, APPROVAL_REVIEW);
      return approvalService.list({ status: args.status ?? null, type: args.type ?? null });
    },
    approvalRequestsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, APPROVAL_REVIEW);
      return approvalService.table(args.query);
    },
    myEcommChangeRequests: (_p: unknown, args: { kind?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, ECOMM_PORTAL);
      return approvalService.listEcommChanges(args.kind ?? null);
    },
  },
  Mutation: {
    approveRequest: (_p: unknown, args: { id: string; notes?: string | null }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, APPROVAL_REVIEW);
      return approvalService.approve(args.id, { id: user.id, name: user.email ?? null }, args.notes);
    },
    denyRequest: (_p: unknown, args: { id: string; notes?: string | null }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, APPROVAL_REVIEW);
      return approvalService.deny(args.id, { id: user.id, name: user.email ?? null }, args.notes);
    },
    submitEcommChangeRequest: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ECOMM_PORTAL);
      return approvalService.submitEcommChange(args.input, { id: user.id, name: user.email ?? null });
    },
  },
};
