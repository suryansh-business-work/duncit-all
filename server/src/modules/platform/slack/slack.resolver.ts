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
      return slackService.sendFeedback(user, args.input);
    },
  },
};
