import { clubService } from './club.service';
import { loadClubStats, primeClubStats } from './club.loaders';
import { throwIfClientGone } from '@utils/clientPresence';
import { venueService } from '@modules/venues/venue/venue.service';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN'];

type ClubMatchParent = {
  location_id?: string | null;
  locality?: string | null;
  super_category_id?: string | null;
  category_id?: string | null;
};

const matchCriteria = (parent: ClubMatchParent) => ({
  location_id: parent.location_id ?? null,
  locality: parent.locality ?? null,
  super_category_id: parent.super_category_id ?? null,
  category_id: parent.category_id ?? null,
});

export const clubResolvers = {
  Club: {
    hosts: (parent: { id: string; host_ids?: string[] }) =>
      clubService.getHosts(parent.id, parent.host_ids ?? []),
    club_admins: (parent: { admin_user_ids?: string[] }) =>
      clubService.getClubAdmins(parent.admin_user_ids ?? []),
    // All three come out of the SAME pair of batched aggregates, primed for the
    // whole page by the `clubs` resolver. Asked one club at a time they were
    // three round trips per row — on the home feed, three per club per request.
    followers_count: async (parent: { id: string }, _a: unknown, ctx: GraphQLContext) =>
      (await loadClubStats(ctx, parent.id)).followers_count,
    rating: async (parent: { id: string }, _a: unknown, ctx: GraphQLContext) =>
      (await loadClubStats(ctx, parent.id)).rating,
    ratings_count: async (parent: { id: string }, _a: unknown, ctx: GraphQLContext) =>
      (await loadClubStats(ctx, parent.id)).ratings_count,
    matched_venues: (parent: ClubMatchParent) =>
      venueService.findMatchingForClub(matchCriteria(parent)),
    matched_venues_count: (parent: ClubMatchParent) =>
      venueService.countMatchingForClub(matchCriteria(parent)),
  },
  Query: {
    clubs: async (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      const rows = await clubService.list(args.filter);
      throwIfClientGone(ctx);
      await primeClubStats(ctx, rows.map((c: any) => String(c?.id ?? '')));
      return rows;
    },
    clubsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      const page = await clubService.table(args.query);
      throwIfClientGone(ctx);
      await primeClubStats(ctx, page.rows.map((c: any) => String(c?.id ?? '')));
      return page;
    },
    club: async (_p: unknown, args: { club_doc_id: string }) => clubService.getById(args.club_doc_id),
    clubBySlug: async (_p: unknown, args: { club_slug: string }) =>
      clubService.getBySlug(args.club_slug),
    clubRatings: async (_p: unknown, args: { club_doc_id: string }) =>
      clubService.listRatings(args.club_doc_id),
    // Shaped by the same mapper the user follow lists use, so each row arrives
    // with follow_status already resolved and its Follow button works without
    // a second round trip.
    clubFollowers: async (_p: unknown, args: { club_doc_id: string }, ctx: GraphQLContext) => {
      const ids = await clubService.followerUserIds(args.club_doc_id);
      const { mapPublicProfiles } = await import('@modules/access/profile/profile.resolver');
      return mapPublicProfiles(ids, ctx.user?.id ?? null);
    },
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
