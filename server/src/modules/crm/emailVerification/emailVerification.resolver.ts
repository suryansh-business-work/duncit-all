import { CRM_RW } from '@modules/crm/crm/crm.constants';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { emailVerificationService } from './emailVerification.service';

const RW = [...CRM_RW];

export const emailVerificationResolvers = {
  Query: {
    crmEmailStatuses: (_p: unknown, args: { emails: string[] }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return emailVerificationService.statuses(args.emails);
    },
    crmEmailVerificationsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return emailVerificationService.table(args.query);
    },
  },
  Mutation: {
    crmVerifyEmail: (_p: unknown, args: { email: string }, ctx: GraphQLContext) =>
      emailVerificationService.verify(requireRole(ctx, RW), args.email),
    crmVerifyEmailsBulk: (
      _p: unknown,
      args: { content_base64: string; filename?: string | null; url?: string | null },
      ctx: GraphQLContext
    ) =>
      emailVerificationService.startBulk(
        requireRole(ctx, RW),
        args.content_base64,
        args.filename ?? '',
        args.url ?? ''
      ),
  },
};
