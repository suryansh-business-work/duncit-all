import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import {
  consoleEditors,
  consoleGovernors,
  consoleReaders,
} from '@modules/portals/console-access';
import { clubAdminProfileService } from './clubAdminProfile.service';
import type { TableQueryInput } from '@utils/table-query';
import { GraphQLError } from 'graphql';

function uid(ctx: GraphQLContext) {
  if (!ctx.user) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return ctx.user.id;
}

/**
 * Reading a Club Admin's record and editing its own details also belongs to
 * whoever was granted the club-admins console (`ALL_CLUB_ADMINS_ACCESS`).
 * Appointing one, approving or rejecting, the commission and the live switch
 * stay with the platform admins and the onboarding desk — appointing in
 * particular, because it grants a role — see `console-access.ts`.
 */
const CA_READ = consoleReaders('CLUB_ADMIN');
const CA_EDIT = consoleEditors('CLUB_ADMIN');
const CA_GOVERN = consoleGovernors('CLUB_ADMIN');
/** Permanent hard-delete is a developer-only action, as it is for the others. */
const DEVELOPER_DELETE = ['SUPER_ADMIN', 'DEVELOPERS_MANAGER'];

export const clubAdminProfileResolvers = {
  Query: {
    clubAdminProfilesTable: (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, CA_READ);
      return clubAdminProfileService.table(args.query);
    },
    clubAdminProfile: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, CA_READ);
      return clubAdminProfileService.byId(args.id);
    },
    clubAdminMatchingClubs: (
      _p: unknown,
      args: { id: string; search?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, CA_READ);
      return clubAdminProfileService.matchingClubs(args.id, args.search);
    },
    // The club form is an admin surface, so it reads the same roles the rest of
    // this module does rather than opening the Club Admin directory wider.
    clubAdminCandidates: (
      _p: unknown,
      args: {
        super_category_id?: string | null;
        category_id?: string | null;
        sub_category_id?: string | null;
        search?: string | null;
      },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, CA_READ);
      return clubAdminProfileService.candidatesForClub(args);
    },
  },

  Mutation: {
    adminCreateClubAdminProfile: (
      _p: unknown,
      args: { user_id: string; input: Record<string, any> },
      ctx: GraphQLContext
    ) => {
      // Appointing grants the CLUB_ADMIN role, so it is governance and not an
      // edit: a console-role editor may correct a Club Admin, not create one.
      requireRole(ctx, CA_GOVERN);
      return clubAdminProfileService.adminCreate(args.user_id, args.input);
    },
    updateClubAdminProfile: (
      _p: unknown,
      args: { id: string; input: Record<string, any> },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, CA_EDIT);
      return clubAdminProfileService.update(args.id, args.input);
    },
    approveClubAdminProfile: (
      _p: unknown,
      args: { id: string; notes?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, CA_GOVERN);
      return clubAdminProfileService.approve(args.id, args.notes);
    },
    rejectClubAdminProfile: (
      _p: unknown,
      args: { id: string; notes: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, CA_GOVERN);
      return clubAdminProfileService.reject(args.id, args.notes);
    },
    setClubAdminCommission: (
      _p: unknown,
      args: { id: string; commission_pct?: number | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, CA_GOVERN);
      return clubAdminProfileService.setCommission(args.id, args.commission_pct ?? null);
    },
    setClubAdminProfileActive: (
      _p: unknown,
      args: { id: string; is_active: boolean },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, CA_GOVERN);
      return clubAdminProfileService.setActive(args.id, args.is_active);
    },
    assignClubAdminClubs: (
      _p: unknown,
      args: { id: string; club_ids: string[] },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, CA_EDIT);
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
