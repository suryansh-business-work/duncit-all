import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { podChangeRequestService } from './podChangeRequest.service';
import type { PodChangeRole } from './podChangeRequest.model';

/**
 * Who may work the queue. The same trio that reviews pods elsewhere —
 * a change request cancels pods and refunds attendees, so it is never opened up
 * to a read-only support role.
 */
const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];

/**
 * Every partner-facing field is `requireAuth` only, and the SERVICE decides
 * whether the caller actually holds the role on that pod
 * (`assertRoleOnPod`) or is the person an offer was made to. A role check here
 * would be the wrong gate twice over: CLUB_ADMIN is a club membership rather
 * than a plain role, and holding VENUE_OWNER says nothing about owning THIS
 * pod's venue.
 */
export const podChangeRequestResolvers = {
  Query: {
    podChangeRequests: (
      _p: unknown,
      args: { role: PodChangeRole; query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return podChangeRequestService.adminTable(args.role, args.query);
    },
    podChangeRequest: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return podChangeRequestService.adminOne(args.id);
    },
    podChangeCandidates: (_p: unknown, args: { request_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return podChangeRequestService.candidates(args.request_id);
    },
    podChangeVenueSlots: (
      _p: unknown,
      args: { request_id: string; venue_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return podChangeRequestService.venueSlots(args.request_id, args.venue_id);
    },
    myPodChangeBoard: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return podChangeRequestService.board(user.id);
    },
  },
  Mutation: {
    requestPodChange: (
      _p: unknown,
      args: { pod_doc_id: string; role: PodChangeRole; reason?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return podChangeRequestService.file(args.pod_doc_id, user.id, args.role, args.reason ?? '');
    },
    withdrawPodChange: (_p: unknown, args: { request_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return podChangeRequestService.withdraw(args.request_id, user.id);
    },
    offerPodChange: (
      _p: unknown,
      args: { input: { request_id: string; user_id: string; venue_id?: string | null; venue_slot_id?: string | null } },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, ADMIN_ROLES);
      return podChangeRequestService.offer(args.input.request_id, user.id, args.input);
    },
    cancelPodForChange: (
      _p: unknown,
      args: { request_id: string; reason: string },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, ADMIN_ROLES);
      return podChangeRequestService.cancelPod(args.request_id, user.id, args.reason);
    },
    respondToPodChange: (
      _p: unknown,
      args: { request_id: string; decision: 'APPROVE' | 'PASS'; reason?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return podChangeRequestService.respond(
        args.request_id,
        user.id,
        args.decision,
        args.reason ?? ''
      );
    },
  },
};
