import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { consoleReaders } from '@modules/portals/console-access';
import { venueChatService } from './venueChat.service';
import { venueChatThreadsService } from './venueChat.threads';

/** Staff who may read a venue's record in the Venues console may read its chats. */
const VENUE_READ = consoleReaders('VENUE');

function requireAuth(ctx: GraphQLContext) {
  if (!ctx.user?.id) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return ctx.user.id;
}

type SendArgs = { pod_id: string; type?: string | null; text?: string | null; image_url?: string | null };
type PageArgs = { limit?: number | null; offset?: number | null };

export const venueChatResolvers = {
  Query: {
    venueChatRoom: async (_: unknown, { pod_id }: { pod_id: string }, ctx: GraphQLContext) => {
      const { thread, side } = await venueChatService.room(pod_id, requireAuth(ctx));
      return {
        pod_id: thread.podId,
        pod_title: thread.podTitle,
        pod_date_time: thread.podDateTime ? thread.podDateTime.toISOString() : null,
        venue_id: thread.venueId,
        venue_name: thread.venueName,
        venue_photo: thread.venuePhoto || null,
        my_side: side,
      };
    },
    venueChatMessages: async (
      _: unknown,
      args: { pod_id: string; limit?: number | null; before?: string | null },
      ctx: GraphQLContext
    ) => venueChatService.messages(args.pod_id, requireAuth(ctx), args.limit ?? 50, args.before),
    myVenueChatThreads: async (_: unknown, args: PageArgs & { venue_id?: string | null }, ctx: GraphQLContext) =>
      venueChatThreadsService.forOwner(requireAuth(ctx), args.venue_id, args.limit, args.offset),
    adminVenueChatThreads: async (_: unknown, args: PageArgs & { venue_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, VENUE_READ);
      return venueChatThreadsService.forStaff(args.venue_id, args.limit, args.offset);
    },
    adminVenueChatMessages: async (
      _: unknown,
      args: { pod_id: string; limit?: number | null; before?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, VENUE_READ);
      return venueChatService.staffMessages(args.pod_id, args.limit ?? 50, args.before);
    },
  },
  Mutation: {
    sendVenueChatMessage: async (_: unknown, args: SendArgs, ctx: GraphQLContext) => {
      if (args.type && args.type !== 'TEXT' && args.type !== 'IMAGE') {
        throw new GraphQLError('Only text and photos can be sent here', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      return venueChatService.send(args.pod_id, requireAuth(ctx), {
        type: args.type === 'IMAGE' ? 'IMAGE' : 'TEXT',
        text: args.text,
        image_url: args.image_url,
      });
    },
  },
};
