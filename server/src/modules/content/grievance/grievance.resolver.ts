import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { userDisplayOf } from '@modules/access/user/user.display';
import { grievanceService } from './grievance.service';

const LEGAL_ROLES = ['SUPER_ADMIN', 'LEGAL_MANAGER'];

export const grievanceResolvers = {
  GrievanceTicket: {
    handled_by_name: async (parent: { handled_by?: unknown }) =>
      parent.handled_by ? (await userDisplayOf(String(parent.handled_by))).name : '',
  },
  Query: {
    grievanceTicketsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return grievanceService.table(args.query);
    },
    grievanceTicket: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return grievanceService.getById(args.id);
    },
    grievanceStats: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return grievanceService.stats();
    },
    // Public on purpose: these are the details we are required to publish.
    grievanceOfficer: () => grievanceService.officer(),
  },
  Mutation: {
    // Open to signed-out visitors. The account is recorded when there is one,
    // so a grievance from a logged-in user is still traceable to them.
    submitGrievance: (_p: unknown, args: { input: any }, ctx: GraphQLContext) =>
      grievanceService.submit(ctx.user?.id ?? null, args.input),
    updateGrievanceStatus: (
      _p: unknown,
      args: { id: string; input: any },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return grievanceService.updateStatus(user.id, args.id, args.input);
    },
    saveGrievanceOfficer: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return grievanceService.saveOfficer(args.input);
    },
    backfillGrievanceIds: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return grievanceService.backfillIds();
    },
  },
};
