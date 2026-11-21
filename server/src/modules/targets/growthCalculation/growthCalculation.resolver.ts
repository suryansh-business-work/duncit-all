import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { PORTAL_ROLE_REQUIREMENTS } from '@modules/portals/portal.constants';
import { growthCalculationService, type GrowthSaveInput, type GrowthUpdateInput } from './growthCalculation.service';

/**
 * The Targets console's own seats, plus super admins. Read from the portal map
 * so "who may use the Growth Calculator" and "who may sign in to the console"
 * can never disagree. Editing and deleting narrow further, per record, in the
 * service: the creator or a super admin.
 */
const TARGETS_ROLES = ['SUPER_ADMIN', ...PORTAL_ROLE_REQUIREMENTS.targets];

type IdArgs = { id: string };

export const growthCalculationResolvers = {
  Query: {
    growthCalculationsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) =>
      growthCalculationService.table(args.query ?? undefined, requireRole(ctx, TARGETS_ROLES)),
    growthCalculation: (_p: unknown, args: IdArgs, ctx: GraphQLContext) =>
      growthCalculationService.byId(args.id, requireRole(ctx, TARGETS_ROLES)),
    growthCalculationPreview: (_p: unknown, args: { inputs: GrowthSaveInput['inputs'] }, ctx: GraphQLContext) => {
      requireRole(ctx, TARGETS_ROLES);
      return growthCalculationService.preview(args.inputs);
    },
  },
  Mutation: {
    saveGrowthCalculation: (_p: unknown, args: { input: GrowthSaveInput }, ctx: GraphQLContext) =>
      growthCalculationService.save(args.input, requireRole(ctx, TARGETS_ROLES)),
    updateGrowthCalculation: (_p: unknown, args: IdArgs & { input: GrowthUpdateInput }, ctx: GraphQLContext) =>
      growthCalculationService.update(args.id, args.input, requireRole(ctx, TARGETS_ROLES)),
    duplicateGrowthCalculation: (
      _p: unknown,
      args: IdArgs & { title: string; client_request_id?: string | null },
      ctx: GraphQLContext
    ) => growthCalculationService.duplicate(args.id, args.title, args.client_request_id, requireRole(ctx, TARGETS_ROLES)),
    deleteGrowthCalculation: (_p: unknown, args: IdArgs, ctx: GraphQLContext) =>
      growthCalculationService.remove(args.id, requireRole(ctx, TARGETS_ROLES)),
  },
};
