import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { emailValidationService } from './emailValidation.service';

/**
 * The log holds addresses from every console — leads, members, partners — so
 * reading it, and re-running checks from it, is the platform admins' alone.
 * Running a check is anyone's who can open the console they run it from
 * (decided in the service, by the portal gate).
 */
export const EMAIL_VALIDATION_ADMINS: readonly string[] = ['SUPER_ADMIN'];

export const emailValidationResolvers = {
  Query: {
    emailValidationsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, EMAIL_VALIDATION_ADMINS);
      return emailValidationService.table(args.query);
    },
  },
  Mutation: {
    validateEmail: (_p: unknown, args: { email: string; portal: string }, ctx: GraphQLContext) =>
      emailValidationService.validate(requireAuth(ctx), args.email, args.portal),
    revalidateEmail: (_p: unknown, args: { id: string }, ctx: GraphQLContext) =>
      emailValidationService.revalidate(requireRole(ctx, EMAIL_VALIDATION_ADMINS), args.id),
  },
};
