import { slackService } from './slack.service';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';

// Slack management + sending is a Tech-portal capability; server-side code calls
// slackService.send directly (ungated) for its own notifications.
const SLACK_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const slackResolvers = {
  Query: {
    slackConfigured: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, SLACK_MANAGE);
      return slackService.configured();
    },
    slackChannels: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, SLACK_MANAGE);
      return slackService.channels();
    },
    slackChannelHistory: (
      _p: unknown,
      args: { channel: string; limit?: number | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, SLACK_MANAGE);
      return slackService.history(args.channel, args.limit);
    },
  },
  Mutation: {
    sendSlackMessage: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, SLACK_MANAGE);
      return slackService.send(args.input);
    },
    // Any signed-in user may report a problem / send feedback; identity is taken
    // from the token, not the client, so this needs no Slack-manage role.
    submitAppFeedback: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      // Saves the report, then announces it best-effort. The return shape is
      // unchanged so the app and mWeb keep working; `ok` now means "filed",
      // which is the thing the reporter actually cares about.
      return feedbackSubmit(user, args.input);
    },
  },
};

/** Kept out of the resolver map so the slack module does not import the support
 * module at load time — they are otherwise independent. */
async function feedbackSubmit(user: { id: string; email?: string | null }, input: any) {
  const { feedbackService } = await import('@modules/support/feedback/feedback.service');
  const report = await feedbackService.submit(user, input);
  return { ok: true, channel: report.report_no, ts: report.slack_ts ?? '' };
}
