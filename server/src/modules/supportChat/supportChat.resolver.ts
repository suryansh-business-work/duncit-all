import type { GraphQLContext } from '../../context';
import { requireAuth, requireRole, hasRole } from '../../middleware/rbac';
import { supportChatService } from './supportChat.service';

const SUPPORT_ROLES = ['SUPER_ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_USER'];

export const supportChatResolvers = {
  Query: {
    supportChatSessions: (_p: unknown, args: { status?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, SUPPORT_ROLES);
      return supportChatService.listSessions(args.status);
    },
    supportChatMessages: async (
      _p: unknown,
      args: { session_id: string; limit?: number; before?: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      const isAgent = hasRole(user, SUPPORT_ROLES);
      const ok = await supportChatService.canAccessSession(args.session_id, user.id, isAgent);
      if (!ok) return [];
      return supportChatService.listMessages(args.session_id, args.limit, args.before);
    },
    mySupportChat: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return supportChatService.getMine(user.id);
    },
  },
  Mutation: {
    startSupportChat: (_p: unknown, args: { text?: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return supportChatService.start(user.id, args.text);
    },
    sendSupportChatMessage: (
      _p: unknown,
      args: { session_id: string; text?: string; attachments?: string[] },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      const isAgent = hasRole(user, SUPPORT_ROLES);
      return supportChatService.sendMessage(user.id, isAgent, {
        sessionId: args.session_id,
        text: args.text,
        attachments: args.attachments,
      });
    },
    closeSupportChat: (_p: unknown, args: { session_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, SUPPORT_ROLES);
      return supportChatService.close(args.session_id);
    },
    markSupportChatRead: (_p: unknown, args: { session_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const isAgent = hasRole(user, SUPPORT_ROLES);
      return supportChatService.markRead(args.session_id, isAgent);
    },
  },
};
