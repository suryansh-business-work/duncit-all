import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { askDuncitActions, pubAction } from '../actions/askDuncit.actions';
import { isAskDuncitSurfaceValue, type AskDuncitSurface } from '../askDuncit.constants';
import { askDuncitConversations } from '../conversation/askDuncit.conversations';
import { askDuncitMemory } from '../conversation/askDuncit.memory';
import type { FeedbackRating } from '../conversation/askDuncitMessage.model';
import type { AttachmentInput } from '../files/askDuncit.files';
import { handOver } from '../handover/askDuncit.handover';
import { buildTurnContext, type PageContext } from '../turn/askDuncit.context';
import { turnRegistry } from '../turn/askDuncit.stream';
import { startTurn } from '../turn/askDuncit.turn';
import { bootstrap } from './askDuncit.bootstrap';

/**
 * The member API. Thin by design: authentication here, everything else in the
 * layers (turn, actions, conversations), which scope every read by the caller.
 */

interface SendArgs {
  input: {
    message: string;
    conversation_id?: string | null;
    role?: string | null;
    surface?: string | null;
    locale?: string | null;
    page?: Partial<PageContext> | null;
    attachments?: AttachmentInput[] | null;
  };
}

const surfaceOf = (value: unknown): AskDuncitSurface => (isAskDuncitSurfaceValue(value) ? value : 'MWEB');

function contextFor(ctx: GraphQLContext, extra: { role?: string | null; surface?: unknown; locale?: string | null; page?: Partial<PageContext> | null } = {}) {
  const user = requireAuth(ctx);
  return buildTurnContext({ user, req: ctx.req, res: ctx.res, requestedRole: extra.role, surface: surfaceOf(extra.surface), locale: extra.locale, page: extra.page });
}

export const askDuncitResolvers = {
  Query: {
    askDuncitBootstrap: async (_: unknown, args: { role?: string | null; page?: Partial<PageContext> | null; surface?: string | null }, ctx: GraphQLContext) =>
      bootstrap(await contextFor(ctx, args)),
    askDuncitConversations: (_: unknown, args: { before?: string | null; limit?: number | null; search?: string | null }, ctx: GraphQLContext) =>
      askDuncitConversations.list(requireAuth(ctx).id, args),
    askDuncitConversation: (_: unknown, args: { id: string }, ctx: GraphQLContext) => askDuncitConversations.get(requireAuth(ctx).id, args.id),
    askDuncitMessages: (_: unknown, args: { conversation_id: string; before?: string | null; limit?: number | null }, ctx: GraphQLContext) =>
      askDuncitConversations.messages(requireAuth(ctx).id, args.conversation_id, args),
    askDuncitMessage: (_: unknown, args: { id: string }, ctx: GraphQLContext) => askDuncitConversations.message(requireAuth(ctx).id, args.id),
    askDuncitMyActions: (_: unknown, args: { limit?: number | null }, ctx: GraphQLContext) =>
      askDuncitActions.listForUser(requireAuth(ctx).id, args.limit ?? 50),
    askDuncitMemory: (_: unknown, __: unknown, ctx: GraphQLContext) => askDuncitMemory.facts(requireAuth(ctx).id),
  },
  Mutation: {
    sendAskDuncitMessage: (_: unknown, { input }: SendArgs, ctx: GraphQLContext) =>
      startTurn({
        user: requireAuth(ctx),
        req: ctx.req,
        res: ctx.res,
        message: input.message,
        conversationId: input.conversation_id,
        requestedRole: input.role,
        surface: surfaceOf(input.surface),
        locale: input.locale,
        page: input.page,
        attachments: input.attachments,
      }),
    stopAskDuncitMessage: (_: unknown, args: { message_id: string }, ctx: GraphQLContext) => turnRegistry.stop(args.message_id, requireAuth(ctx).id),
    decideAskDuncitAction: async (_: unknown, args: { id: string; approve: boolean; surface?: string | null }, ctx: GraphQLContext) => {
      const action = await askDuncitActions.getOwned(requireAuth(ctx).id, args.id);
      // The action runs under the role it was proposed in — re-resolved, so a
      // role taken away since then means the account's own role, not that one.
      const turn = await contextFor(ctx, { role: action.role_key, surface: args.surface });
      const done = args.approve ? await askDuncitActions.approve(turn, action) : await askDuncitActions.reject(turn, action);
      return pubAction(done);
    },
    rollbackAskDuncitAction: async (_: unknown, args: { id: string; surface?: string | null }, ctx: GraphQLContext) => {
      const action = await askDuncitActions.getOwned(requireAuth(ctx).id, args.id);
      const turn = await contextFor(ctx, { role: action.role_key, surface: args.surface });
      return pubAction(await askDuncitActions.rollback(turn, action));
    },
    rateAskDuncitMessage: async (_: unknown, args: { message_id: string; rating: FeedbackRating; comment?: string | null }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return askDuncitConversations.feedback({ user_id: user.id, account_roles: user.roles }, args.message_id, args.rating, args.comment);
    },
    handOverAskDuncitConversation: async (
      _: unknown,
      args: { conversation_id: string; team?: string | null; summary?: string | null; role?: string | null; surface?: string | null },
      ctx: GraphQLContext
    ) => handOver(await contextFor(ctx, args), args.conversation_id, args.team, args.summary),
    renameAskDuncitConversation: (_: unknown, args: { id: string; title: string }, ctx: GraphQLContext) =>
      askDuncitConversations.rename(requireAuth(ctx).id, args.id, args.title),
    deleteAskDuncitConversation: (_: unknown, args: { id: string }, ctx: GraphQLContext) => askDuncitConversations.remove(requireAuth(ctx).id, args.id),
    clearAskDuncitHistory: (_: unknown, __: unknown, ctx: GraphQLContext) => askDuncitConversations.removeAll(requireAuth(ctx).id),
    forgetAskDuncitFact: (_: unknown, args: { id: string }, ctx: GraphQLContext) => askDuncitMemory.forget(requireAuth(ctx).id, args.id),
    clearAskDuncitMemory: (_: unknown, __: unknown, ctx: GraphQLContext) => askDuncitMemory.clear(requireAuth(ctx).id),
  },
};
