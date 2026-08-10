import { GraphQLError } from 'graphql';
import { chatService } from './chat.service';
import type { GraphQLContext } from '@context';
import { emitToPod } from './chat.socket';
import {
  displayFrom,
  userDisplayMap,
  userDisplayOf,
  type UserDisplay,
} from '@modules/access/user/user.display';

function requireAuth(ctx: GraphQLContext) {
  if (!ctx.user?.id) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return ctx.user.id;
}

/**
 * Shape a message for both GraphQL and the socket.
 *
 * The name and photo are resolved from the account NOW rather than read off the
 * row, which no longer stores them. `display` is passed in so a page of
 * messages costs one user query instead of one per message.
 *
 * Both paths go through here on purpose: the socket pushes this object
 * straight to connected clients, so a field resolver would never run for the
 * realtime copy and a renamed user would appear correctly on refresh and
 * wrongly the moment they posted.
 */
function shape(doc: any, display: UserDisplay) {
  return {
    id: String(doc._id || doc.id),
    pod_id: String(doc.pod_id),
    user_id: String(doc.user_id),
    user_name: display.name,
    user_photo: display.photo,
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
      return pods.map((p: any) => {
        // club_id is populated to { _id, club_id (slug), super_category_id }.
        const club = p.club_id && typeof p.club_id === 'object' ? p.club_id : null;
        let clubId: string | null = null;
        if (club) {
          clubId = String(club._id);
        } else if (p.club_id) {
          clubId = String(p.club_id);
        }
        return {
          id: String(p._id),
          pod_id: String(p._id),
          pod_slug: p.pod_id || null,
          pod_title: p.pod_title,
          pod_date_time: p.pod_date_time ? new Date(p.pod_date_time).toISOString() : null,
          pod_end_date_time: p.pod_end_date_time
            ? new Date(p.pod_end_date_time).toISOString()
            : null,
          // Identity, deliberately: this drives who is IN the chat, and a
          // multi-seat buyer is still one person in it. Do not seat-adjust this
          // the way pod occupancy was — the guests they brought have no account.
          pod_attendees: (p.pod_attendees || []).map(String),
          no_of_spots: p.no_of_spots,
          club_id: clubId,
          club_slug: club?.club_id || null,
          super_category_id: club?.super_category_id ? String(club.super_category_id) : null,
          cover_url: p.pod_images_and_videos?.find((m: any) => m.type !== 'VIDEO')?.url || null,
        };
      });
    },
    chatParticipants: async (_: any, args: { pod_id: string }, ctx: GraphQLContext) => {
      const uid = requireAuth(ctx);
      return chatService.chatParticipants(args.pod_id, uid);
    },
    podMessages: async (
      _: any,
      args: { pod_id: string; limit?: number; before?: string },
      ctx: GraphQLContext
    ) => {
      const uid = requireAuth(ctx);
      const docs = await chatService.listMessages(args.pod_id, uid, args.limit, args.before);
      const display = await userDisplayMap(docs.map((d: any) => d.user_id));
      return docs.map((d: any) => shape(d, displayFrom(display, d.user_id)));
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
      const shaped = shape(doc, await userDisplayOf(uid));
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
      // The message's AUTHOR, not the reacting user — a reaction rebroadcasts
      // the whole message, and resolving `uid` here would relabel someone
      // else's message with the name of whoever last tapped an emoji on it.
      const shaped = shape(doc, await userDisplayOf(doc.user_id));
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
      const shaped = shape(doc, await userDisplayOf(doc.user_id));
      emitToPod(shaped.pod_id, 'deleted', shaped);
      return shaped;
    },
  },
};
