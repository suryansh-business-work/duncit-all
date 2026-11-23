import type { GraphQLContext } from '@context';
import type { TableQueryInput } from '@utils/table-query';
import { portalSecurityReview } from './portalSecurity.review';
import { portalSecurityService } from './portalSecurity.service';

/**
 * The verification operations run for a PENDING console sign-in
 * (`ctx.portalSecurity`) — the one caller every other resolver reads as signed
 * out. The review operations are the opposite: a signed-in SUPER_ADMIN or
 * TECH_MANAGER, checked server-side in the service.
 */
export const portalSecurityResolvers = {
  Query: {
    portalSecurityChallenge: (_p: unknown, _a: unknown, ctx: GraphQLContext) => portalSecurityService.challenge(ctx),
    portalSecurityException: (_p: unknown, _a: unknown, ctx: GraphQLContext) => portalSecurityService.exceptionStatus(ctx),
    portalSecurityLogsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) =>
      portalSecurityReview.logsTable(ctx, args.query),
    portalSecurityLog: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => portalSecurityReview.logDetail(ctx, args.id),
    portalSecurityExceptionsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) =>
      portalSecurityReview.exceptionsTable(ctx, args.query),
  },
  Mutation: {
    submitPortalSecurityVerification: (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) =>
      portalSecurityService.submit(ctx, args.input),
    requestPortalSecurityException: (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) =>
      portalSecurityService.requestException(ctx, args.input),
    decidePortalSecurityException: (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) =>
      portalSecurityReview.decideException(ctx, args.input),
  },
};
