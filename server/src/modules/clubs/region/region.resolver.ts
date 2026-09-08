import { regionService } from './region.service';
import { regionPodService } from './region.pod';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';

/**
 * The role IS the whole boundary.
 *
 * Every read here resolves the caller's OWN region — no query takes a region
 * id — so holding the role grants a manager their patch and nobody else's. The
 * ids that ARE accepted (a club admin, a club, a pod) are each checked against
 * that region before anything is read, in `region.scope`.
 *
 * SUPER_ADMIN is in the list to make the console openable for support, and
 * gets a region of their own like anyone else rather than a view of all of them.
 */
const REGIONAL_RW = ['REGIONAL_CLUB_ADMIN', 'SUPER_ADMIN'];

/** One keystroke of the Club Admin picker. */
const DEFAULT_CANDIDATE_LIMIT = 20;
const MAX_CANDIDATE_LIMIT = 50;

export const regionResolvers = {
  Query: {
    myRegion: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, REGIONAL_RW);
      return regionService.myRegion(user.id);
    },
    myRegionTree: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, REGIONAL_RW);
      return regionService.myRegionTree(user.id);
    },
    myRegionMembers: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, REGIONAL_RW);
      return regionService.members(user.id);
    },
    regionClubAdminCandidates: async (
      _p: unknown,
      args: { search?: string | null; limit?: number | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, REGIONAL_RW);
      const limit = Math.min(
        MAX_CANDIDATE_LIMIT,
        Math.max(1, args.limit ?? DEFAULT_CANDIDATE_LIMIT)
      );
      return regionService.candidates(user.id, args.search ?? '', limit);
    },
    regionHostPods: async (
      _p: unknown,
      args: { host_user_id: string; query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, REGIONAL_RW);
      return regionPodService.hostPods(user.id, args.host_user_id, args.query);
    },
    regionClubAdminClubs: async (
      _p: unknown,
      args: { user_id: string; query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, REGIONAL_RW);
      return regionPodService.clubAdminClubs(user.id, args.user_id, args.query);
    },
    regionClubPods: async (
      _p: unknown,
      args: { club_id: string; query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, REGIONAL_RW);
      return regionPodService.clubPods(user.id, args.club_id, args.query);
    },
    regionPodAttendees: async (
      _p: unknown,
      args: { pod_doc_id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, REGIONAL_RW);
      return regionPodService.podAttendees(user.id, args.pod_doc_id);
    },
    regionPodAuditLogs: async (
      _p: unknown,
      args: { pod_doc_id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, REGIONAL_RW);
      return regionPodService.podAuditLogs(user.id, args.pod_doc_id);
    },
    regionPodPayments: async (
      _p: unknown,
      args: { pod_doc_id: string; query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, REGIONAL_RW);
      return regionPodService.podPayments(user.id, args.pod_doc_id, args.query);
    },
    regionPodFeedback: async (
      _p: unknown,
      args: { pod_doc_id: string; limit?: number | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, REGIONAL_RW);
      return regionPodService.podFeedback(user.id, args.pod_doc_id, args.limit);
    },
    regionPodHost: async (
      _p: unknown,
      args: { pod_doc_id: string; user_id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, REGIONAL_RW);
      return regionPodService.podHost(user.id, args.pod_doc_id, args.user_id);
    },
  },
  Mutation: {
    renameMyRegion: async (_p: unknown, args: { region_name: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, REGIONAL_RW);
      return regionService.rename(user.id, args.region_name);
    },
    addRegionClubAdmin: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, REGIONAL_RW);
      return regionService.addClubAdmin(user.id, args.user_id);
    },
    removeRegionClubAdmin: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, REGIONAL_RW);
      return regionService.removeClubAdmin(user.id, args.user_id);
    },
  },
};
