import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { venueChatService } from './venueChat.service';

function requireAuth(ctx: GraphQLContext) {
  if (!ctx.user?.id) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return ctx.user.id;
}

type SendArgs = { pod_id: string; type?: string | null; text?: string | null; image_url?: string | null };

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
