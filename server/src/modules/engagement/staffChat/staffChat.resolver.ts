import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { STAFF_ROLES } from './staffChat.model';
import { staffChatService } from './staffChat.service';
import { statusOf } from './staffPresence';
import { previewLink } from './staffChat.links';
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
      args: { peer_id: string; limit?: number | null; before?: string | null },
      ctx: GraphQLContext
    ) => {
      const me = requireRole(ctx, ROLES);
      return staffChatService.messages(me.id, args.peer_id, args.limit ?? 50, args.before);
    },
    staffLinkPreview: (_p: unknown, args: { url: string }, ctx: GraphQLContext) => {
      const me = requireRole(ctx, ROLES);
      // Resolved against the CALLER's roles: the badge answers "can I open
      // this", which is what the person looking at it wants to know.
      return previewLink(args.url, me.roles);
    },
    pinnedStaffMessages: (_p: unknown, args: { peer_id: string }, ctx: GraphQLContext) => {
      const me = requireRole(ctx, ROLES);
      return staffChatService.pinned(me.id, args.peer_id);
    },
    searchStaffMessages: (
      _p: unknown,
      args: {
        peer_id: string;
        filter?: {
          text?: string | null;
          from_user_id?: string | null;
          after?: string | null;
          before?: string | null;
          only_files?: boolean | null;
          only_links?: boolean | null;
        } | null;
      },
      ctx: GraphQLContext
    ) => {
      const me = requireRole(ctx, ROLES);
      return staffChatService.search(me.id, args.peer_id, {
        text: args.filter?.text,
        fromUserId: args.filter?.from_user_id,
        after: args.filter?.after,
        before: args.filter?.before,
        onlyFiles: args.filter?.only_files,
        onlyLinks: args.filter?.only_links,
      });
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
    staffMessageEdits: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ['SUPER_ADMIN']);
      return staffChatService.messageEdits(args.id);
    },
    staffChatState: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const me = requireRole(ctx, ROLES);
      return staffChatService.chatState(me.id);
    },
  },
  Mutation: {
    saveStaffChatState: (
      _p: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const me = requireRole(ctx, ROLES);
      return staffChatService.saveChatState(me.id, args.input ?? {});
    },
    clearStaffThread: (_p: unknown, args: { peer_id: string }, ctx: GraphQLContext) => {
      const me = requireRole(ctx, ROLES);
      return staffChatService.clearThread(me.id, args.peer_id);
    },
    attachStaffCallRecording: (
      _p: unknown,
      args: { call_id: string; url: string },
      ctx: GraphQLContext
    ) => {
      const me = requireRole(ctx, ROLES);
      return staffChatService.attachRecording(me.id, args.call_id, args.url);
    },
    sendStaffMessage: async (
      _p: unknown,
      args: {
        to_user_id: string;
        text: string;
        attachment_url?: string | null;
        attachment_name?: string | null;
        attachment_type?: string | null;
        attachment_size?: number | null;
        attachment_peaks?: number[] | null;
        reply_to_id?: string | null;
      },
      ctx: GraphQLContext
    ) => {
      const me = requireRole(ctx, ROLES);
      const message = await staffChatService.send(
        me.id,
        args.to_user_id,
        args.text,
        {
          url: args.attachment_url,
          name: args.attachment_name,
          type: args.attachment_type,
          size: args.attachment_size,
          peaks: args.attachment_peaks ?? [],
        },
        { replyToId: args.reply_to_id }
      );
      // After the write, so a socket that arrives first cannot show a message
      // that failed to save.
      emitStaffMessage(message);
      // Delivered means "it reached a tab of theirs", which is exactly what an
      // open socket says — so the second tick is decided here rather than
      // trusting the recipient's client to report on itself.
      if (statusOf(args.to_user_id) !== 'OFFLINE') {
        const delivered = await staffChatService.markDelivered(args.to_user_id, me.id);
        if (delivered > 0) emitStaffMessage(message, 'staff_message_changed');
      }
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
      args: { id: string; emoji: string },
      ctx: GraphQLContext
    ) => {
      const me = requireRole(ctx, ROLES);
      const message = await staffChatService.react(me.id, args.id, args.emoji);
      // The same event the edit and delete paths use, so a client that already
      // replaces a message by id needs no new handler.
      emitStaffMessage(message, 'staff_message_changed');
      return message;
    },
    forwardStaffMessage: async (
      _p: unknown,
      args: { id: string; to_user_id: string },
      ctx: GraphQLContext
    ) => {
      const me = requireRole(ctx, ROLES);
      const message = await staffChatService.forward(me.id, args.id, args.to_user_id);
      emitStaffMessage(message);
      return message;
    },
    pinStaffMessage: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const me = requireRole(ctx, ROLES);
      const message = await staffChatService.pin(me.id, args.id);
      // Pins belong to the thread, so the other side has to hear about it.
      emitStaffMessage(message, 'staff_message_changed');
      return message;
    },
    markStaffThreadRead: (_p: unknown, args: { peer_id: string }, ctx: GraphQLContext) => {
      const me = requireRole(ctx, ROLES);
      return staffChatService.markRead(me.id, args.peer_id);
    },
  },
};
