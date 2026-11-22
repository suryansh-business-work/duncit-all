import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { clubHostsService } from './clubHosts.service';

const actorOf = (ctx: GraphQLContext) => {
  const user = requireAuth(ctx);
  return { id: user.id, roles: user.roles };
};

/** Spread into clubAdminResolvers — CLUB_ADMIN is a club membership, checked per club in the service. */
export const clubHostsResolvers = {
  Query: {
    clubAdminClubHostsTable: (
      _p: unknown,
      args: { club_id: string; query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => clubHostsService.hostsTable(actorOf(ctx), args.club_id, args.query),
    clubAdminClubHostsSummary: (_p: unknown, args: { club_id: string }, ctx: GraphQLContext) =>
      clubHostsService.hostsSummary(actorOf(ctx), args.club_id),
    clubAdminHostDetail: (_p: unknown, args: { club_id: string; user_id: string }, ctx: GraphQLContext) =>
      clubHostsService.hostDetail(actorOf(ctx), args.club_id, args.user_id),
  },
  Mutation: {
    setClubHostEngagement: (
      _p: unknown,
      args: { club_id: string; host_user_id: string; status_key: string; note?: string | null },
      ctx: GraphQLContext
    ) =>
      clubHostsService.setEngagement(actorOf(ctx), args.club_id, args.host_user_id, args.status_key, args.note),
  },
};
