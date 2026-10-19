import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { chatService } from './chat.service';
import type { GraphQLContext } from '@context';
import { emitToRoom } from './chat.socket';
import { chatRetention, podChatDeletesAt } from './chat.retention';
import { PodModel } from '@modules/pods/pod/pod.model';
import { assertRoomMember, canModerateRoom, roomOfMessage, type ChatRoomRef } from './chat.access';
import { notifyNewChatMessage } from './chat.notify';
import {
  shapeClubRoom,
  shapeMessage,
  shapePodRoom,
  type ClubRoomDoc,
  type StoredMessage,
} from './chat.shape';
import { ClubModel } from '@modules/clubs/club/club.model';
import { displayFrom, userDisplayMap, userDisplayOf } from '@modules/access/user/user.display';

function requireAuth(ctx: GraphQLContext) {
  if (!ctx.user?.id) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return ctx.user.id;
}

type MessageType = 'TEXT' | 'IMAGE' | 'STICKER';
type SendArgs = { type?: MessageType; text?: string; image_url?: string };
type PageArgs = { limit?: number; before?: string };

/** Stored lines shaped for the client, with names resolved in one query. */
async function shapeAll(docs: StoredMessage[]) {
  const display = await userDisplayMap(docs.map((d) => String(d.user_id)));
  return docs.map((d) => shapeMessage(d, displayFrom(display, String(d.user_id))));
}

/** One page of a room, oldest first, for its members. */
async function pageOf(room: ChatRoomRef, uid: string, limit?: number, before?: string) {
  return shapeAll(await chatService.listMessages(room, uid, limit, before));
}

type PreviewArgs = PageArgs & { pod_id?: string | null; club_id?: string | null };

/** The details-page chat card: a pod's or a club's history, read-only. */
async function chatPreview(args: PreviewArgs, uid: string) {
  if (Boolean(args.pod_id) === Boolean(args.club_id)) {
    throw new GraphQLError('Pass exactly one of pod_id or club_id', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const room: ChatRoomRef = args.pod_id
    ? { kind: 'POD', id: args.pod_id }
    : { kind: 'CLUB', id: String(args.club_id) };
  const preview = await chatService.previewRoom(room, uid, args.limit, args.before);
  return {
    messages: await shapeAll(preview.docs),
    total_count: preview.total,
    is_member: preview.isMember,
    closed: preview.closed,
  };
}

/** Posts, broadcasts to the room, and pushes the members who are away. */
async function send(room: ChatRoomRef, uid: string, args: SendArgs) {
  const doc: StoredMessage = await chatService.postMessage({
    room,
    userId: uid,
    type: args.type,
    text: args.text,
    imageUrl: args.image_url,
  });
  const shaped = shapeMessage(doc, await userDisplayOf(uid));
  emitToRoom(room, 'message', shaped);
  notifyNewChatMessage({
    room,
    senderId: uid,
    senderName: shaped.user_name || '',
    preview: shaped.type === 'IMAGE' ? 'Photo' : shaped.text.slice(0, 120),
  }).catch(() => undefined);
  return shaped;
}

async function clubRoomFor(clubId: string, uid: string) {
  await assertRoomMember({ kind: 'CLUB', id: clubId }, uid);
  const club = await ClubModel.findById(clubId)
    .select('club_id club_name club_feature_images_and_videos super_category_id')
    .lean<ClubRoomDoc>();
  if (!club) throw new GraphQLError('Club not found', { extensions: { code: 'NOT_FOUND' } });
  const [{ clubDays }, canModerate] = await Promise.all([
    chatRetention(),
    canModerateRoom({ kind: 'CLUB', id: clubId }, uid),
  ]);
  return shapeClubRoom(club, { retentionDays: clubDays, canModerate });
}

/** A pod room's retention and moderation facts, for its members. */
async function podChatInfo(podId: string, uid: string) {
  const room: ChatRoomRef = { kind: 'POD', id: podId };
  await assertRoomMember(room, uid);
  const [pod, { podHours }, canModerate] = await Promise.all([
    PodModel.findById(podId).select('pod_date_time pod_end_date_time').lean(),
    chatRetention(),
    canModerateRoom(room, uid),
  ]);
  const end = pod ? podChatDeletesAt(pod, 0) : null;
  return {
    chat_deletes_at: pod ? (podChatDeletesAt(pod, podHours)?.toISOString() ?? null) : null,
    closed: !!end && Date.now() > end.getTime(),
    can_moderate: canModerate,
  };
}

export const chatResolvers = {
  Query: {
    myChatRooms: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const uid = requireAuth(ctx);
      const [pods, { podHours }] = await Promise.all([
        chatService.listMyChatRooms(uid),
        chatRetention(),
      ]);
      return pods.map((p) => shapePodRoom(p, podHours));
    },
    chatParticipants: async (_: unknown, args: { pod_id: string }, ctx: GraphQLContext) => {
      const uid = requireAuth(ctx);
      return chatService.chatParticipants(args.pod_id, uid);
    },
    podMessages: async (_: unknown, args: PageArgs & { pod_id: string }, ctx: GraphQLContext) =>
      pageOf({ kind: 'POD', id: args.pod_id }, requireAuth(ctx), args.limit, args.before),
    podChatInfo: async (_: unknown, args: { pod_id: string }, ctx: GraphQLContext) =>
      podChatInfo(args.pod_id, requireAuth(ctx)),
    chatPreview: async (_: unknown, args: PreviewArgs, ctx: GraphQLContext) =>
      chatPreview(args, requireAuth(ctx)),
    myClubChatRooms: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const uid = requireAuth(ctx);
      const [rooms, { clubDays }] = await Promise.all([
        chatService.listMyClubRooms(uid),
        chatRetention(),
      ]);
      return rooms.map(({ club, last }) =>
        shapeClubRoom(club, {
          retentionDays: clubDays,
          canModerate: (club.admin_user_ids || []).map(String).includes(uid),
          last,
        })
      );
    },
    clubChatRoom: async (_: unknown, args: { club_id: string }, ctx: GraphQLContext) =>
      clubRoomFor(args.club_id, requireAuth(ctx)),
    clubMessages: async (_: unknown, args: PageArgs & { club_id: string }, ctx: GraphQLContext) =>
      pageOf({ kind: 'CLUB', id: args.club_id }, requireAuth(ctx), args.limit, args.before),
  },
  Mutation: {
    sendPodMessage: async (_: unknown, args: SendArgs & { pod_id: string }, ctx: GraphQLContext) =>
      send({ kind: 'POD', id: args.pod_id }, requireAuth(ctx), args),
    sendClubMessage: async (
      _: unknown,
      args: SendArgs & { club_id: string },
      ctx: GraphQLContext
    ) => {
      if (!Types.ObjectId.isValid(args.club_id)) {
        throw new GraphQLError('Invalid club id', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      return send({ kind: 'CLUB', id: args.club_id }, requireAuth(ctx), args);
    },
    reactToPodMessage: async (
      _: unknown,
      args: { message_id: string; emoji: string },
      ctx: GraphQLContext
    ) => {
      const uid = requireAuth(ctx);
      const doc: StoredMessage = await chatService.toggleReaction({
        messageId: args.message_id,
        userId: uid,
        emoji: args.emoji,
      });
      // The message's AUTHOR, not the reacting user — a reaction rebroadcasts
      // the whole message, and resolving `uid` here would relabel someone
      // else's message with the name of whoever last tapped an emoji on it.
      const shaped = shapeMessage(doc, await userDisplayOf(String(doc.user_id)));
      emitToRoom(roomOfMessage(doc), 'reaction', shaped);
      return shaped;
    },
    deletePodMessage: async (_: unknown, args: { message_id: string }, ctx: GraphQLContext) => {
      const uid = requireAuth(ctx);
      const doc: StoredMessage | null = await chatService.deleteMessage(args.message_id, uid);
      if (!doc) return null;
      const shaped = shapeMessage(doc, await userDisplayOf(String(doc.user_id)));
      emitToRoom(roomOfMessage(doc), 'deleted', shaped);
      return shaped;
    },
  },
};
