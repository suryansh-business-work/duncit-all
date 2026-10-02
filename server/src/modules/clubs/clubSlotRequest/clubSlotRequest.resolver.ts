import { requireAuth, requireRole } from '@middleware/rbac';
import { consoleEditors, consoleReaders } from '@modules/portals/console-access';
import type { TableQueryInput } from '@utils/table-query';
import type { GraphQLContext } from '@context';
import { clubSlotRequestService } from './clubSlotRequest.service';

/** Any signed-in host may ask; the Clubs console reads and closes the requests. */
export const clubSlotRequestResolvers = {
  Query: {
    clubSlotRequestsTable: (_p: unknown, args: { query?: TableQueryInput }, ctx: GraphQLContext) => {
      requireRole(ctx, consoleReaders('CLUB'));
      return clubSlotRequestService.table(args.query);
    },
  },
  Mutation: {
    requestClubVenueSlots: (_p: unknown, args: { club_doc_id: string }, ctx: GraphQLContext) =>
      clubSlotRequestService.request(args.club_doc_id, requireAuth(ctx).id),
    resolveClubSlotRequest: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, consoleEditors('CLUB'));
      return clubSlotRequestService.resolve(args.id, requireAuth(ctx).id);
    },
  },
};
