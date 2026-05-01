import { interviewService } from './interview.service';
import type { GraphQLContext } from '../../context';
import { requireAuth, requireRole } from '../../middleware/rbac';

const ADMIN_RW = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const interviewResolvers = {
  Query: {
    interviews: async (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return interviewService.list(args.filter);
    },
    interview: async (_p: unknown, args: { interview_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return interviewService.getById(args.interview_doc_id);
    },
    myInterviews: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return interviewService.listForUser(u.id);
    },
  },
  Mutation: {
    createInterview: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return interviewService.create(args.input, u.id);
    },
    updateInterview: async (
      _p: unknown,
      args: { interview_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return interviewService.update(args.interview_doc_id, args.input);
    },
    deleteInterview: async (
      _p: unknown,
      args: { interview_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return interviewService.remove(args.interview_doc_id);
    },
  },
};
