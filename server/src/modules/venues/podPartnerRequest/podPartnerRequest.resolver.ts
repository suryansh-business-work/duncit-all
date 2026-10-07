import { requireAuth } from '@middleware/rbac';
import type { GraphQLContext } from '@context';
import type { PartnerRequestDirection } from './podPartnerRequest.model';
import { podPartnerSearch, type NearbyArgs } from './podPartnerRequest.search';
import { podPartnerRequestService, type SendPartnerRequestInput } from './podPartnerRequest.service';
import type { PartnerSide } from './podPartnerRequest.view';

/**
 * Every operation is scoped to the caller: a venue owner only acts on their own
 * venues, a host only as themselves, and a request only by its two parties —
 * checked in the service, so no client can reach the other side's actions.
 */
export const podPartnerRequestResolvers = {
  Query: {
    nearbyHostsForVenue: (_p: unknown, args: { venue_id: string; search: NearbyArgs }, ctx: GraphQLContext) =>
      podPartnerSearch.nearbyHosts(requireAuth(ctx).id, args.venue_id, args.search),
    nearbyVenuesForHost: (_p: unknown, args: { search: NearbyArgs }, ctx: GraphQLContext) =>
      podPartnerSearch.nearbyVenues(requireAuth(ctx).id, args.search),
    myPodPartnerRequests: (
      _p: unknown,
      args: { side: PartnerSide; direction?: PartnerRequestDirection | null; venue_id?: string | null },
      ctx: GraphQLContext
    ) => podPartnerRequestService.list(requireAuth(ctx).id, args.side, args.direction, args.venue_id),
    podPartnerRequest: (_p: unknown, args: { id: string }, ctx: GraphQLContext) =>
      podPartnerRequestService.get(requireAuth(ctx).id, args.id),
    podPartnerRequestQuota: (_p: unknown, args: { side: PartnerSide; venue_id?: string | null }, ctx: GraphQLContext) =>
      podPartnerRequestService.quota(requireAuth(ctx).id, args.side, args.venue_id),
  },
  Mutation: {
    sendPodPartnerRequest: (_p: unknown, args: { input: SendPartnerRequestInput }, ctx: GraphQLContext) =>
      podPartnerRequestService.send(requireAuth(ctx).id, args.input),
    respondPodPartnerRequest: (_p: unknown, args: { id: string; accept: boolean }, ctx: GraphQLContext) =>
      podPartnerRequestService.respond(requireAuth(ctx).id, args.id, args.accept),
    cancelPodPartnerRequest: (_p: unknown, args: { id: string }, ctx: GraphQLContext) =>
      podPartnerRequestService.cancel(requireAuth(ctx).id, args.id),
    requestPodPartnerSlot: (_p: unknown, args: { id: string; slot_id: string }, ctx: GraphQLContext) =>
      podPartnerRequestService.requestSlot(requireAuth(ctx).id, args.id, args.slot_id),
    respondPodPartnerSlot: (_p: unknown, args: { id: string; confirm: boolean }, ctx: GraphQLContext) =>
      podPartnerRequestService.respondSlot(requireAuth(ctx).id, args.id, args.confirm),
  },
};
