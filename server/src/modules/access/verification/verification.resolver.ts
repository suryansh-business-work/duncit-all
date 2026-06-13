import { verificationService } from './verification.service';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'];

export const verificationResolvers = {
  Query: {
    myVerifications: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return verificationService.listForUser(u.id);
    },
    userVerifications: (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return verificationService.listForUser(args.user_id);
    },
  },
  Mutation: {
    submitVerification: (
      _p: unknown,
      args: { type: string; document_url: string },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return verificationService.submit(u.id, args.type, args.document_url);
    },
    reviewVerification: (
      _p: unknown,
      args: { user_id: string; type: string; status: string; reject_reason?: string },
      ctx: GraphQLContext
    ) => {
      const admin = requireRole(ctx, ADMIN_ROLES);
      return verificationService.review(
        admin.id,
        args.user_id,
        args.type,
        args.status,
        args.reject_reason
      );
    },
  },
};
