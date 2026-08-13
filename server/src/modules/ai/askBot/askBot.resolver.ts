import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { askBotService, type AskBotChatArgs } from './askBot.service';

/**
 * The Ask Bot surface.
 *
 * Signed-in only, on both fields: the drawer this opens from only renders inside
 * a console, every answer spends OpenAI credit, and the link list is tailored to
 * the caller's own roles — none of which means anything without a user.
 */
export const askBotResolvers = {
  Query: {
    askBots: (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return askBotService.listBots();
    },
  },
  Mutation: {
    askBotChat: (_: unknown, args: { input: AskBotChatArgs }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return askBotService.chat(args.input, user.id, ctx.req);
    },
  },
};
