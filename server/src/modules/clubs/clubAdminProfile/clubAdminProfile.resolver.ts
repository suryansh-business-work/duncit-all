import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { clubAdminProfileService } from './clubAdminProfile.service';
import type { TableQueryInput } from '@utils/table-query';
import { GraphQLError } from 'graphql';

function uid(ctx: GraphQLContext) {
  if (!ctx.user) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return ctx.user.id;
}

/** The same reviewers who decide on brands, hosts and venues decide on these. */
const REVIEW_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'ONBOARDING_MANAGER'];
/** Permanent hard-delete is a developer-only action, as it is for the others. */
const DEVELOPER_DELETE = ['SUPER_ADMIN', 'DEVELOPERS_MANAGER'];

export const clubAdminProfileResolvers = {
  Query: {
    clubAdminProfilesTable: (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, REVIEW_ROLES);
      return clubAdminProfileService.table(args.query);
    },
    clubAdminProfile: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, REVIEW_ROLES);
      return clubAdminProfileService.byId(args.id);
    },
    clubAdminMatchingClubs: (
      _p: unknown,
      args: { id: string; search?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, REVIEW_ROLES);
      return clubAdminProfileService.matchingClubs(args.id, args.search);
    },
  },

  Mutation: {
    updateClubAdminProfile: (
      _p: unknown,
      args: { id: string; input: Record<string, any> },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, REVIEW_ROLES);
      return clubAdminProfileService.update(args.id, args.input);
    },
    approveClubAdminProfile: (
      _p: unknown,
      args: { id: string; notes?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, REVIEW_ROLES);
      return clubAdminProfileService.approve(args.id, args.notes);
    },
    rejectClubAdminProfile: (
      _p: unknown,
      args: { id: string; notes: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, REVIEW_ROLES);
      return clubAdminProfileService.reject(args.id, args.notes);
    },
    setClubAdminCommission: (
      _p: unknown,
      args: { id: string; commission_pct?: number | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, REVIEW_ROLES);
      return clubAdminProfileService.setCommission(args.id, args.commission_pct ?? null);
    },
    setClubAdminProfileActive: (
      _p: unknown,
      args: { id: string; is_active: boolean },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, REVIEW_ROLES);
      return clubAdminProfileService.setActive(args.id, args.is_active);
    },
    assignClubAdminClubs: (
      _p: unknown,
      args: { id: string; club_ids: string[] },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, REVIEW_ROLES);
      return clubAdminProfileService.assignClubs(args.id, args.club_ids);
    },
    deleteClubAdminProfile: async (
      _p: unknown,
      args: { id: string; email: string; password: string },
      ctx: GraphQLContext
    ) => {
      // Developer-only permanent delete, re-confirmed with the caller's own
      // email + password (this cannot be undone).
      requireRole(ctx, DEVELOPER_DELETE);
      const { userService } = await import('@modules/access/user/user.service');
      await userService.assertPasswordConfirmation(uid(ctx), args.email, args.password);
      return clubAdminProfileService.remove(args.id);
    },
    backfillClubAdminProfiles: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ['SUPER_ADMIN']);
      return clubAdminProfileService.backfill();
    },
  },
};
