import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { chatService } from './chat.service';
import type { GraphQLContext } from '@context';
import { emitToRoom } from './chat.socket';
import { chatRetention, podChatDeletesAt } from './chat.retention';
import { PodModel } from '@modules/pods/pod/pod.model';
import {
  assertRoomMember,
  blockedPeerIds,
  canModerateRoom,
  roomOfMessage,
  type ChatRoomRef,
} from './chat.access';
import { notifyNewChatMessage } from './chat.notify';
import { shapeClubRoom, shapePodRoom, type ClubRoomDoc, type StoredMessage } from './chat.shape';
import { shapeMessages, shapeOne } from './chat.messages';
import { chatMuteService } from './chat.mute';
import { unreadCounts } from './chat.unread';
import { chatStateResolvers } from './chat.state.resolver';
import { ClubModel } from '@modules/clubs/club/club.model';

function requireAuth(ctx: GraphQLContext) {
  if (!ctx.user?.id) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return ctx.user.id;
}

type MessageType = 'TEXT' | 'IMAGE' | 'STICKER';
type SendArgs = {
  type?: MessageType;
  text?: string;
  image_url?: string;
  reply_to_id?: string | null;
  mentions?: string[] | null;
};
type PageArgs = { limit?: number; before?: string };

/** Stored lines shaped for one reader, quotes and mentions resolved in batches. */
async function shapeAll(docs: StoredMessage[], uid: string) {
  return shapeMessages(docs, await blockedPeerIds(uid));
}

/** One page of a room, oldest first, for its members. */
async function pageOf(room: ChatRoomRef, uid: string, limit?: number, before?: string) {
  return shapeAll(await chatService.listMessages(room, uid, limit, before), uid);
}

/** The viewer's unread count and mute for each room of a kind — two reads per kind. */
async function roomStates(uid: string, kind: ChatRoomRef['kind'], ids: string[]) {
  const [unread, mutes] = await Promise.all([
    unreadCounts(uid, kind, ids),
    chatMuteService.statesFor(uid, kind, ids),
  ]);
  return (id: string) => ({
    unread_count: unread.get(id) ?? 0,
    is_muted: mutes.get(id)?.is_muted ?? false,
    muted_until: mutes.get(id)?.muted_until ?? null,
  });
}

/** The viewer's mute of one room, as the room's own fields. */
async function muteFields(uid: string, room: ChatRoomRef) {
  const state = (await chatMuteService.statesFor(uid, room.kind, [room.id])).get(room.id);
  return { is_muted: state?.is_muted ?? false, muted_until: state?.muted_until ?? null };
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
    messages: await shapeAll(preview.docs, uid),
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
    replyToId: args.reply_to_id,
    mentions: args.mentions,
  });
  const shaped = await shapeOne(doc);
  emitToRoom(room, 'message', shaped);
  notifyNewChatMessage({
    room,
    messageId: shaped.id,
    senderId: uid,
    senderName: shaped.user_name || '',
    preview: shaped.type === 'IMAGE' ? 'Photo' : shaped.text.slice(0, 120),
    type: shaped.type || 'TEXT',
    mentions: shaped.mentions,
  }).catch(() => undefined);
  return shaped;
}

async function clubRoomFor(clubId: string, uid: string) {
  await assertRoomMember({ kind: 'CLUB', id: clubId }, uid);
  const club = await ClubModel.findById(clubId)
    .select('club_id club_name club_feature_images_and_videos super_category_id')
    .lean<ClubRoomDoc>();
  if (!club) throw new GraphQLError('Club not found', { extensions: { code: 'NOT_FOUND' } });
  const [{ clubDays }, canModerate, mute] = await Promise.all([
    chatRetention(),
    canModerateRoom({ kind: 'CLUB', id: clubId }, uid),
    muteFields(uid, { kind: 'CLUB', id: clubId }),
  ]);
  // The open room's own header: its unread count is not shown there.
  return { ...shapeClubRoom(club, { retentionDays: clubDays, canModerate }), ...mute, unread_count: 0 };
}

/** A pod room's retention and moderation facts, for its members. */
async function podChatInfo(podId: string, uid: string) {
  const room: ChatRoomRef = { kind: 'POD', id: podId };
  await assertRoomMember(room, uid);
  const [pod, { podHours }, canModerate, mute] = await Promise.all([
    PodModel.findById(podId).select('pod_date_time pod_end_date_time').lean(),
    chatRetention(),
    canModerateRoom(room, uid),
    muteFields(uid, room),
  ]);
  const end = pod ? podChatDeletesAt(pod, 0) : null;
  return {
    chat_deletes_at: pod ? (podChatDeletesAt(pod, podHours)?.toISOString() ?? null) : null,
    closed: !!end && Date.now() > end.getTime(),
    can_moderate: canModerate,
    ...mute,
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
      const stateOf = await roomStates(uid, 'POD', pods.map((p) => String(p._id)));
      return pods.map((p) => ({ ...shapePodRoom(p, podHours), ...stateOf(String(p._id)) }));
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
      const stateOf = await roomStates(uid, 'CLUB', rooms.map(({ club }) => String(club._id)));
      return rooms.map(({ club, last }) => ({
        ...shapeClubRoom(club, {
          retentionDays: clubDays,
          canModerate: (club.admin_user_ids || []).map(String).includes(uid),
          last,
        }),
        ...stateOf(String(club._id)),
      }));
    },
    clubChatRoom: async (_: unknown, args: { club_id: string }, ctx: GraphQLContext) =>
      clubRoomFor(args.club_id, requireAuth(ctx)),
    clubMessages: async (_: unknown, args: PageArgs & { club_id: string }, ctx: GraphQLContext) =>
      pageOf({ kind: 'CLUB', id: args.club_id }, requireAuth(ctx), args.limit, args.before),
    ...chatStateResolvers.Query,
  },
  Mutation: {
    ...chatStateResolvers.Mutation,
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
      const shaped = await shapeOne(doc);
      emitToRoom(roomOfMessage(doc), 'reaction', shaped);
      return shaped;
    },
    deletePodMessage: async (_: unknown, args: { message_id: string }, ctx: GraphQLContext) => {
      const uid = requireAuth(ctx);
      const doc: StoredMessage | null = await chatService.deleteMessage(args.message_id, uid);
      if (!doc) return null;
      const shaped = await shapeOne(doc);
      emitToRoom(roomOfMessage(doc), 'deleted', shaped);
      return shaped;
    },
  },
};
