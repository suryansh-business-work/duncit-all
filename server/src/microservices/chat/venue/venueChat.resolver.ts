import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { consoleReaders } from '@modules/portals/console-access';
import { venueChatService } from './venueChat.service';
import { venueChatLineService } from './venueChat.lines';
import { venueChatThreadsService } from './venueChat.threads';
import { chatParties, counterpartOf } from './venueChat.contacts';
import { readMarksFor } from './venueChat.marks';

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

const orNull = (value: string) => value || null;

export const venueChatResolvers = {
  Query: {
    venueChatRoom: async (_: unknown, { pod_id }: { pod_id: string }, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      const { thread, side } = await venueChatService.room(pod_id, userId);
      const [parties, readMarks] = await Promise.all([chatParties(thread), readMarksFor(thread, userId)]);
      const contact = counterpartOf(parties, side);
      return {
        pod_id: thread.podId,
        pod_title: thread.podTitle,
        pod_date_time: thread.podDateTime ? thread.podDateTime.toISOString() : null,
        venue_id: thread.venueId,
        venue_name: thread.venueName,
        venue_photo: orNull(thread.venuePhoto),
        my_side: side,
        pod_is_free: thread.podIsFree,
        counterpart_name: orNull(contact.name),
        counterpart_phone: orNull(contact.phone),
        counterpart_email: orNull(contact.email),
        host: parties.host ? { ...parties.host, photo: orNull(parties.host.photo) } : null,
        venue: { ...parties.venue, photo: orNull(parties.venue.photo) },
        read_marks: readMarks,
      };
    },
    venueChatMessages: async (
      _: unknown,
      args: { pod_id: string; limit?: number | null; before?: string | null; mark_read?: boolean | null },
      ctx: GraphQLContext
    ) => venueChatService.messages(args.pod_id, requireAuth(ctx), args.limit ?? 50, args.before, args.mark_read !== false),
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
    reactToVenueChatMessage: async (_: unknown, args: { message_id: string; emoji: string }, ctx: GraphQLContext) =>
      venueChatLineService.react(args.message_id, requireAuth(ctx), args.emoji),
    editVenueChatMessage: async (_: unknown, args: { message_id: string; text: string }, ctx: GraphQLContext) =>
      venueChatLineService.edit(args.message_id, requireAuth(ctx), args.text),
    deleteVenueChatMessage: async (_: unknown, args: { message_id: string }, ctx: GraphQLContext) =>
      venueChatLineService.remove(args.message_id, requireAuth(ctx)),
    markVenueChatRead: async (_: unknown, args: { pod_id: string }, ctx: GraphQLContext) =>
      venueChatLineService.markRead(args.pod_id, requireAuth(ctx)),
  },
};
