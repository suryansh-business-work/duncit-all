import { Types } from 'mongoose';

import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import { userDisplayOf } from '@modules/access/user/user.display';
import { postService } from '@modules/engagement/post/post.service';
import type { TableQueryInput } from '@utils/table-query';
import { reportService, type ReportMailRecipient } from './report.service';
import { reportCategoryService, type ReportCategoryInput } from './reportCategory.service';

const LEGAL_ROLES = ['SUPER_ADMIN', 'LEGAL_MANAGER'];

/** How the report table stores a user reference. */
type ReportedId = Types.ObjectId | string | null;

/** An id the table stored resolved to a display name, or '' when there is none. */
const nameOf = async (id: Types.ObjectId | string | null | undefined) =>
  id ? (await userDisplayOf(id.toString())).name : '';

interface IdArg {
  id: string;
}

interface NoteArgs extends IdArg {
  note?: string | null;
}

interface CategoryArgs {
  input: ReportCategoryInput;
}

interface MailArgs extends IdArg {
  input: { recipient: ReportMailRecipient; subject: string; message: string };
}

export const contentReportResolvers = {
  ContentReport: {
    reporter_name: (parent: { reporter_id?: ReportedId }) => nameOf(parent.reporter_id),
    target_owner_name: (parent: { target_owner_id?: ReportedId }) => nameOf(parent.target_owner_id),
    handled_by_name: (parent: { handled_by?: ReportedId }) => nameOf(parent.handled_by),
  },
  ContentReportAction: {
    by_name: (parent: { by?: ReportedId }) => nameOf(parent.by),
  },
  Query: {
    // Signed-in only, not Legal-only: this is what the report dialog renders.
    reportCategories: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return reportCategoryService.listActive();
    },
    reportCategoriesTable: (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, LEGAL_ROLES);
      return reportCategoryService.table(args.query);
    },
    contentReportsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return reportService.table(args.query);
    },
    contentReport: (_p: unknown, args: IdArg, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return reportService.getById(args.id);
    },
    contentReportStats: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return reportService.stats();
    },
  },
  Mutation: {
    reportPost: async (
      _p: unknown,
      args: { post_doc_id: string; reason: string; details?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      // The snapshot comes from the post, never from the caller: a reporter
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
    takeDownReportedContent: (_p: unknown, args: NoteArgs, ctx: GraphQLContext) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return reportService.takeDown(user.id, args.id, args.note);
    },
    markReportedContentOk: (_p: unknown, args: NoteArgs, ctx: GraphQLContext) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return reportService.markOk(user.id, args.id, args.note);
    },
    sendContentReportMail: (_p: unknown, args: MailArgs, ctx: GraphQLContext) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return reportService.sendMail(user.id, args.id, args.input);
    },
    createReportCategory: (_p: unknown, args: CategoryArgs, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return reportCategoryService.create(args.input);
    },
    updateReportCategory: (_p: unknown, args: IdArg & CategoryArgs, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return reportCategoryService.update(args.id, args.input);
    },
    deleteReportCategory: (_p: unknown, args: IdArg, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return reportCategoryService.remove(args.id);
    },
  },
};
