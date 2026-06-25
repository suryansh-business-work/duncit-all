import { approvalService } from './approval.service';
import type { ApprovalStatus } from './approval.model';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

// The Admin console reviews requests from any portal.
const APPROVAL_REVIEW = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];

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
  },
};
