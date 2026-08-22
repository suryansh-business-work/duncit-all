import { feedbackService } from './feedback.service';
import { requireAuth, requireRole } from '@middleware/rbac';
import type { GraphQLContext } from '@context';

/** Who reads and triages reported problems. */
const SUPPORT_ROLES = ['SUPER_ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_USER'];

export const feedbackResolvers = {
  Query: {
    reportedProblemsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, SUPPORT_ROLES);
      return feedbackService.table(args.query);
    },
    reportedProblem: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, SUPPORT_ROLES);
      return feedbackService.byId(args.id);
    },
    // Any signed-in user: the app renders its own form from this, so gating it
    // to Support would leave every reporter with an empty category row.
    reportProblemConfig: (_p: unknown, _args: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return feedbackService.config();
    },
    // Support-only, unlike the config above: this one carries the workspace's
    // channel list, which every reporter has no business reading.
    reportProblemSlackSettings: (_p: unknown, _args: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, SUPPORT_ROLES);
      return feedbackService.slackSettings();
    },
  },
  Mutation: {
    setFeedbackReportStatus: (
      _p: unknown,
      args: { id: string; status: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, SUPPORT_ROLES);
      return feedbackService.setStatus(args.id, args.status);
    },
    updateReportProblemConfig: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, SUPPORT_ROLES);
      return feedbackService.updateConfig(args.input);
    },
    updateReportProblemSlack: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, SUPPORT_ROLES);
      return feedbackService.updateSlack(args.input);
    },
  },
};
