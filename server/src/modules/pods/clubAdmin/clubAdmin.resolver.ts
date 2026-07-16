import { clubAdminService } from './clubAdmin.service';
import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';

const actorOf = (ctx: GraphQLContext) => {
  const user = requireAuth(ctx);
  return { id: user.id, roles: user.roles };
};

export const clubAdminResolvers = {
  Query: {
    myAdminClubs: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return clubAdminService.listAdminClubs(user.id);
    },
    myAdminClubsPage: (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return clubAdminService.listAdminClubsPage(user.id, args.filter ?? {});
    },
    myAdminClubsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return clubAdminService.clubsInfoTable(user.id, args.query);
    },
    clubAdminDashboard: (
      _p: unknown,
      args: { from?: string | null; to?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return clubAdminService.dashboard(user.id, args.from, args.to);
    },
    clubAdminDashboardTable: (
      _p: unknown,
      args: { query?: any; from?: string | null; to?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return clubAdminService.dashboardClubsTable(user.id, args.query, args.from, args.to);
    },
    clubAdminHostSearch: (_p: unknown, args: { search?: string | null }, ctx: GraphQLContext) =>
      clubAdminService.searchHosts(actorOf(ctx), args.search),
  },
  Mutation: {
    clubAdminCreatePod: (_p: unknown, args: { input: any }, ctx: GraphQLContext) =>
      clubAdminService.createPod(actorOf(ctx), args.input),
    clubAdminUpdatePod: (
      _p: unknown,
      args: { pod_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => clubAdminService.updatePod(actorOf(ctx), args.pod_doc_id, args.input),
    clubAdminDeletePod: (_p: unknown, args: { pod_doc_id: string }, ctx: GraphQLContext) =>
      clubAdminService.deletePod(actorOf(ctx), args.pod_doc_id),
    clubAdminUpdateClub: (
      _p: unknown,
      args: { club_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => clubAdminService.updateClub(actorOf(ctx), args.club_doc_id, args.input),
  },
};
