import { slackService } from './slack.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

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
  },
};
