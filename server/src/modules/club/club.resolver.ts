import { clubService } from './club.service';
import type { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/rbac';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const clubResolvers = {
  Query: {
    clubs: async (_p: unknown, args: { filter?: any }) => clubService.list(args.filter),
    club: async (_p: unknown, args: { club_doc_id: string }) => clubService.getById(args.club_doc_id),
  },
  Mutation: {
    createClub: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return clubService.create(args.input);
    },
    updateClub: async (
      _p: unknown,
      args: { club_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return clubService.update(args.club_doc_id, args.input);
    },
    deleteClub: async (_p: unknown, args: { club_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return clubService.remove(args.club_doc_id);
    },
  },
};
