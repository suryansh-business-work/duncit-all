import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { chatMuteService, type ChatMuteDuration } from './chat.mute';
import { chatUnreadService } from './chat.unread';
import { clubChatMembers } from './chat.members';
import { CHAT_ROOM_KINDS, type ChatRoomKind } from './chatState.model';
import type { ChatRoomRef } from './chat.access';

function requireAuth(ctx: GraphQLContext) {
  if (!ctx.user?.id) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return ctx.user.id;
}

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/** A room reference from client input: a known kind and a well-formed id. */
function roomArgs(args: { kind: string; id: string }): { kind: ChatRoomKind; id: string } {
  if (!(CHAT_ROOM_KINDS as ReadonlyArray<string>).includes(args.kind)) throw badInput('Unknown chat kind');
  if (!Types.ObjectId.isValid(args.id)) throw badInput('Invalid chat id');
  return { kind: args.kind as ChatRoomKind, id: args.id };
}

/** Pod and club rooms only — support chat keeps its own read marks. */
function podOrClub(room: { kind: ChatRoomKind; id: string }): ChatRoomRef {
  if (room.kind === 'SUPPORT') throw badInput('Support chat has its own read state');
  return { kind: room.kind, id: room.id };
}

/** Mute, read marks and the @ list for pod, club and support chats. */
export const chatStateResolvers = {
  Query: {
    clubChatMembers: async (
      _: unknown,
      args: { club_id: string; search?: string | null; limit?: number | null },
      ctx: GraphQLContext
    ) => {
      if (!Types.ObjectId.isValid(args.club_id)) throw badInput('Invalid club id');
      return clubChatMembers(args.club_id, requireAuth(ctx), args.search, args.limit);
    },
    chatMuteState: async (_: unknown, args: { kind: string; id: string }, ctx: GraphQLContext) => {
      const room = roomArgs(args);
      return chatMuteService.stateFor(requireAuth(ctx), room.kind, room.id);
    },
    chatUnreadTotal: async (_: unknown, __: unknown, ctx: GraphQLContext) =>
      chatUnreadService.unreadTotal(requireAuth(ctx)),
  },
  Mutation: {
    muteChat: async (
      _: unknown,
      args: { kind: string; id: string; duration: ChatMuteDuration },
      ctx: GraphQLContext
    ) => {
      const room = roomArgs(args);
      return chatMuteService.mute(requireAuth(ctx), room.kind, room.id, args.duration);
    },
    unmuteChat: async (_: unknown, args: { kind: string; id: string }, ctx: GraphQLContext) => {
      const room = roomArgs(args);
      return chatMuteService.unmute(requireAuth(ctx), room.kind, room.id);
    },
    markChatRead: async (_: unknown, args: { kind: string; id: string }, ctx: GraphQLContext) =>
      chatUnreadService.markRead(requireAuth(ctx), podOrClub(roomArgs(args))),
  },
};
