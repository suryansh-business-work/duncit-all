import { officialStatusService } from './officialStatus.service';
import { officialStatusInputSchema } from './officialStatus.validator';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import { userDisplayOf } from '@modules/access/user/user.display';
import { validate } from '@utils/validate';

/** Who publishes a status — the same roles that own the rest of marketing. */
const MARKETING_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER'];

export const officialStatusResolvers = {
  /*
    Resolved per field rather than in the service's toPub: each of these is a
    second read, and only the Marketing table selects them. The apps ask the
    same query on every home load and render none of the three.
  */
  OfficialStatus: {
    location_names: (parent: { location_ids: string[] }) =>
      officialStatusService.locationNames(parent.location_ids),
    view_count: (parent: { id: string }) => officialStatusService.viewCount(parent.id),
    created_by: async (parent: { created_by_id?: string }) =>
      (await userDisplayOf(parent.created_by_id)).name,
  },
  Query: {
    officialStatusesTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, MARKETING_WRITE);
      return officialStatusService.table(args.query);
    },
    // Open to a signed-out viewer: the rail renders before anybody logs in,
    // and the only per-viewer part of the answer is the unseen ring.
    officialStatuses: (
      _p: unknown,
      args: { location_doc_id?: string | null },
      ctx: GraphQLContext
    ) => officialStatusService.liveFor(args.location_doc_id, ctx.user?.id ?? null),
  },
  Mutation: {
    createOfficialStatus: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, MARKETING_WRITE);
      const data = await validate(officialStatusInputSchema, args.input);
      return officialStatusService.create(data, user.id);
    },
    updateOfficialStatus: async (
      _p: unknown,
      args: { status_doc_id: string; input: unknown },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, MARKETING_WRITE);
      const data = await validate(officialStatusInputSchema, args.input);
      return officialStatusService.update(args.status_doc_id, data);
    },
    deleteOfficialStatus: (_p: unknown, args: { status_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, MARKETING_WRITE);
      return officialStatusService.remove(args.status_doc_id);
    },
    recordOfficialStatusView: (
      _p: unknown,
      args: { status_doc_id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return officialStatusService.markSeen(user.id, args.status_doc_id);
    },
  },
};
