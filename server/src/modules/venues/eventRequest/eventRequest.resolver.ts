import { requireAuth, requireRole } from '@middleware/rbac';
import { consoleReaders } from '@modules/portals/console-access';
import type { TableQueryInput } from '@utils/table-query';
import type { GraphQLContext } from '@context';
import { eventRequestService, type RequestEventInput } from './eventRequest.service';
import { respondToEventRequest, type EventRequestOfferInput } from './eventRequest.respond';

type TargetArgs = { target_type: string };
type TableArgs = TargetArgs & { query?: TableQueryInput | null };

/** The console that reads a kind of request: venues console for VENUE, hosts console for HOST. */
const requireConsole = (ctx: GraphQLContext, targetType: string) =>
  requireRole(ctx, consoleReaders(targetType === 'VENUE' ? 'VENUE' : 'HOST'));

/**
 * Any signed-in member may ask; a partner reads only what is addressed to them
 * (scoped in the service by the venues they own or by themself as host); the
 * Venues / Hosts consoles read every request of their kind.
 */
export const eventRequestResolvers = {
  Query: {
    myEventRequestState: (_p: unknown, args: TargetArgs & { target_id: string }, ctx: GraphQLContext) =>
      eventRequestService.myState(requireAuth(ctx).id, args.target_type, args.target_id),
    myReceivedEventRequestsTable: (_p: unknown, args: TableArgs, ctx: GraphQLContext) =>
      eventRequestService.ownerTable(requireAuth(ctx).id, args.target_type, args.query),
    myReceivedEventRequestCounts: (_p: unknown, args: TargetArgs, ctx: GraphQLContext) =>
      eventRequestService.ownerCounts(requireAuth(ctx).id, args.target_type),
    eventRequestsTable: (_p: unknown, args: TableArgs, ctx: GraphQLContext) => {
      requireConsole(ctx, args.target_type);
      return eventRequestService.consoleTable(args.target_type, args.query);
    },
    eventRequestCounts: (_p: unknown, args: TargetArgs, ctx: GraphQLContext) => {
      requireConsole(ctx, args.target_type);
      return eventRequestService.consoleCounts(args.target_type);
    },
  },
  Mutation: {
    requestEvent: (_p: unknown, args: { input: RequestEventInput }, ctx: GraphQLContext) =>
      eventRequestService.request(requireAuth(ctx).id, args.input),
    updateEventRequestStatus: (_p: unknown, args: { id: string; status: string }, ctx: GraphQLContext) =>
      eventRequestService.updateStatus(requireAuth(ctx), args.id, args.status),
    respondToEventRequest: (
      _p: unknown,
      args: { id: string; response: string; note?: string | null; offer?: EventRequestOfferInput | null },
      ctx: GraphQLContext
    ) => respondToEventRequest(requireAuth(ctx), args.id, args.response, args.note, args.offer),
  },
};
