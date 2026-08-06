import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { STAFF_ROLES } from './staffChat.model';
import { staffChatService } from './staffChat.service';
import { emitStaffMessage } from './staffChat.socket';

/**
 * Only staff may use any of this — including reading the directory.
 *
 * The same role list that decides who APPEARS decides who may look, so a
 * customer account cannot enumerate the people who work here.
 */
const ROLES = STAFF_ROLES as readonly string[];

export const staffChatResolvers = {
  Query: {
    coworkers: (
      _p: unknown,
      args: { search?: string | null; role?: string | null },
      ctx: GraphQLContext
    ) => {
      const me = requireRole(ctx, ROLES);
      return staffChatService.coworkers(me.id, args.search, args.role);
    },
    staffThreads: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const me = requireRole(ctx, ROLES);
      return staffChatService.threads(me.id);
    },
    staffMessages: (
      _p: unknown,
      args: { peer_id: string; limit?: number | null },
      ctx: GraphQLContext
    ) => {
      const me = requireRole(ctx, ROLES);
      return staffChatService.messages(me.id, args.peer_id, args.limit ?? 50);
    },
    staffUnreadCount: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const me = requireRole(ctx, ROLES);
      return staffChatService.unreadCount(me.id);
    },
  },
  Mutation: {
    sendStaffMessage: async (
      _p: unknown,
      args: { to_user_id: string; text: string },
      ctx: GraphQLContext
    ) => {
      const me = requireRole(ctx, ROLES);
      const message = await staffChatService.send(me.id, args.to_user_id, args.text);
      // After the write, so a socket that arrives first cannot show a message
      // that failed to save.
      emitStaffMessage(message);
      return message;
    },
    markStaffThreadRead: (_p: unknown, args: { peer_id: string }, ctx: GraphQLContext) => {
      const me = requireRole(ctx, ROLES);
      return staffChatService.markRead(me.id, args.peer_id);
    },
  },
};
