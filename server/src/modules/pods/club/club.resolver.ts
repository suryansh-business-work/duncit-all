import { clubService } from './club.service';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const clubResolvers = {
  Club: {
    hosts: (parent: { id: string; host_ids?: string[] }) =>
      clubService.getHosts(parent.id, parent.host_ids ?? []),
    followers_count: (parent: { id: string }) => clubService.followersCount(parent.id),
    rating: (parent: { id: string }) => clubService.getRating(parent.id),
    ratings_count: (parent: { id: string }) => clubService.getRatingsCount(parent.id),
  },
  Query: {
    clubs: async (_p: unknown, args: { filter?: any }) => clubService.list(args.filter),
    club: async (_p: unknown, args: { club_doc_id: string }) => clubService.getById(args.club_doc_id),
    clubBySlug: async (_p: unknown, args: { club_slug: string }) =>
      clubService.getBySlug(args.club_slug),
    clubRatings: async (_p: unknown, args: { club_doc_id: string }) =>
      clubService.listRatings(args.club_doc_id),
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
    addClubRating: async (
      _p: unknown,
      args: { club_doc_id: string; stars: number; comment?: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return clubService.addRating(args.club_doc_id, user.id, args.stars, args.comment);
    },
  },
};
