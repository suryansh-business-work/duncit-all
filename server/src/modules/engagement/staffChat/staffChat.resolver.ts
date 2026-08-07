import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { STAFF_ROLES } from './staffChat.model';
import { staffChatService } from './staffChat.service';
import type { StaffReactionKind } from './staffChat.model';
import { emitStaffMessage } from './staffChat.socket';
import { snapshot } from './staffPresence';

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
    staffPresence: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ROLES);
      return snapshot();
    },
    staffCalls: (
      _p: unknown,
      args: { peer_id: string; limit?: number | null },
      ctx: GraphQLContext
    ) => {
      const me = requireRole(ctx, ROLES);
      return staffChatService.calls(me.id, args.peer_id, args.limit ?? 50);
    },
  },
  Mutation: {
    sendStaffMessage: async (
      _p: unknown,
      args: {
        to_user_id: string;
        text: string;
        attachment_url?: string | null;
        attachment_name?: string | null;
        attachment_type?: string | null;
      },
      ctx: GraphQLContext
    ) => {
      const me = requireRole(ctx, ROLES);
      const message = await staffChatService.send(me.id, args.to_user_id, args.text, {
        url: args.attachment_url,
        name: args.attachment_name,
        type: args.attachment_type,
      });
      // After the write, so a socket that arrives first cannot show a message
      // that failed to save.
      emitStaffMessage(message);
      return message;
    },
    editStaffMessage: async (
      _p: unknown,
      args: { id: string; text: string },
      ctx: GraphQLContext
    ) => {
      const me = requireRole(ctx, ROLES);
      const message = await staffChatService.edit(me.id, args.id, args.text);
      // The other end is looking at the old words until it is told otherwise.
      emitStaffMessage(message, 'staff_message_changed');
      return message;
    },
    deleteStaffMessage: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const me = requireRole(ctx, ROLES);
      const message = await staffChatService.remove(me.id, args.id);
      emitStaffMessage(message, 'staff_message_changed');
      return message;
    },
    reactToStaffMessage: async (
      _p: unknown,
      args: { id: string; kind: StaffReactionKind },
      ctx: GraphQLContext
    ) => {
      const me = requireRole(ctx, ROLES);
      const message = await staffChatService.react(me.id, args.id, args.kind);
      // The same event the edit and delete paths use, so a client that already
      // replaces a message by id needs no new handler.
      emitStaffMessage(message, 'staff_message_changed');
      return message;
    },
    markStaffThreadRead: (_p: unknown, args: { peer_id: string }, ctx: GraphQLContext) => {
      const me = requireRole(ctx, ROLES);
      return staffChatService.markRead(me.id, args.peer_id);
    },
  },
};
