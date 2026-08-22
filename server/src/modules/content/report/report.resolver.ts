import { Types } from 'mongoose';

import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import { userDisplayOf } from '@modules/access/user/user.display';
import { postService } from '@modules/engagement/post/post.service';
import { reportService } from './report.service';

const LEGAL_ROLES = ['SUPER_ADMIN', 'LEGAL_MANAGER'];

/** How the report table stores a user reference. */
type ReportedId = Types.ObjectId | string | null;

/** An id the table stored resolved to a display name, or '' when there is none. */
const nameOf = async (id: Types.ObjectId | string | null | undefined) =>
  id ? (await userDisplayOf(id.toString())).name : '';

export const contentReportResolvers = {
  ContentReport: {
    reporter_name: (parent: { reporter_id?: ReportedId }) => nameOf(parent.reporter_id),
    target_owner_name: (parent: { target_owner_id?: ReportedId }) => nameOf(parent.target_owner_id),
    handled_by_name: (parent: { handled_by?: ReportedId }) => nameOf(parent.handled_by),
  },
  Query: {
    contentReportsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return reportService.table(args.query);
    },
    contentReport: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return reportService.getById(args.id);
    },
    contentReportStats: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return reportService.stats();
    },
  },
  Mutation: {
    reportStory: async (
      _p: unknown,
      args: { post_doc_id: string; reason: string; details?: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      // The snapshot comes from the story, never from the caller: a reporter
      // must not be able to file a row describing media that was never there.
      const snapshot = await postService.reportSnapshot(args.post_doc_id);
      return reportService.submit(user.id, snapshot, {
        reason: args.reason,
        details: args.details,
      });
    },
    updateContentReportStatus: (
      _p: unknown,
      args: { id: string; input: any },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return reportService.updateStatus(user.id, args.id, args.input);
    },
  },
};
