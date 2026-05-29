import { GraphQLError } from 'graphql';
import { chatService } from './chat.service';
import type { GraphQLContext } from '@context';
import { emitToPod } from './chat.socket';

function requireAuth(ctx: GraphQLContext) {
  if (!ctx.user?.id) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return ctx.user.id;
}

function shape(doc: any) {
  return {
    id: String(doc._id || doc.id),
    pod_id: String(doc.pod_id),
    user_id: String(doc.user_id),
    user_name: doc.user_name || '',
    user_photo: doc.user_photo || '',
    type: doc.type,
    text: doc.text || '',
    image_url: doc.image_url || '',
    reactions: (doc.reactions || []).map((r: any) => ({
      user_id: String(r.user_id),
      emoji: r.emoji,
    })),
    deleted: !!doc.deleted,
    createdAt: (doc.createdAt || new Date()).toISOString(),
  };
}

export const chatResolvers = {
  Query: {
    myChatRooms: async (_: any, __: any, ctx: GraphQLContext) => {
      const uid = requireAuth(ctx);
      const pods = await chatService.listMyChatRooms(uid);
      return pods.map((p: any) => ({
        id: String(p._id),
        pod_id: String(p._id),
        pod_title: p.pod_title,
        pod_date_time: p.pod_date_time ? new Date(p.pod_date_time).toISOString() : null,
        pod_attendees: (p.pod_attendees || []).map(String),
        no_of_spots: p.no_of_spots,
        club_id: p.club_id ? String(p.club_id) : null,
        cover_url:
          p.pod_images_and_videos?.find((m: any) => m.type !== 'VIDEO')?.url || null,
      }));
    },
    podMessages: async (
      _: any,
      args: { pod_id: string; limit?: number; before?: string },
      ctx: GraphQLContext
    ) => {
      const uid = requireAuth(ctx);
      const docs = await chatService.listMessages(args.pod_id, uid, args.limit, args.before);
      return docs.map(shape);
    },
  },
  Mutation: {
    sendPodMessage: async (
      _: any,
      args: { pod_id: string; type?: any; text?: string; image_url?: string },
      ctx: GraphQLContext
    ) => {
      const uid = requireAuth(ctx);
      const doc = await chatService.postMessage({
        podId: args.pod_id,
        userId: uid,
        type: args.type,
        text: args.text,
        imageUrl: args.image_url,
      });
      const shaped = shape(doc);
      emitToPod(args.pod_id, 'message', shaped);
      return shaped;
    },
    reactToPodMessage: async (
      _: any,
      args: { message_id: string; emoji: string },
      ctx: GraphQLContext
    ) => {
      const uid = requireAuth(ctx);
      const doc = await chatService.toggleReaction({
        messageId: args.message_id,
        userId: uid,
        emoji: args.emoji,
      });
      const shaped = shape(doc);
      emitToPod(shaped.pod_id, 'reaction', shaped);
      return shaped;
    },
    deletePodMessage: async (
      _: any,
      args: { message_id: string },
      ctx: GraphQLContext
    ) => {
      const uid = requireAuth(ctx);
      const doc = await chatService.deleteMessage(args.message_id, uid);
      if (!doc) return null;
      const shaped = shape(doc);
      emitToPod(shaped.pod_id, 'deleted', shaped);
      return shaped;
    },
  },
};
