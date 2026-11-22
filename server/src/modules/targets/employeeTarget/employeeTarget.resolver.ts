import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { PORTAL_ROLE_REQUIREMENTS } from '@modules/portals/portal.constants';
import { employeeTargetService } from './employeeTarget.service';
import { employeeTargetSettingsService, type EmployeeTargetSettingsInput } from './employeeTarget.settings';

/**
 * Two gates, like employee expenses. The Targets console's seats (read from the
 * portal map, so "who may set targets" and "who may sign in to the console"
 * cannot disagree) set and review targets; the employee half only ever reaches
 * the caller's own records — the service scopes every one of those calls to
 * the session's user id.
 */
const TARGETS_ROLES = ['SUPER_ADMIN', ...PORTAL_ROLE_REQUIREMENTS.targets];
const EMPLOYEE_RW = ['EMPLOYEE', 'SUPER_ADMIN'];

type IdArgs = { id: string };
type TableArgs = { query?: TableQueryInput | null };

export const employeeTargetResolvers = {
  Query: {
    employeeTargetsTable: async (_p: unknown, args: TableArgs, ctx: GraphQLContext) => {
      requireRole(ctx, TARGETS_ROLES);
      return employeeTargetService.table(args.query ?? undefined);
    },
    employeeTarget: async (_p: unknown, args: IdArgs, ctx: GraphQLContext) => {
      requireRole(ctx, TARGETS_ROLES);
      return employeeTargetService.byId(args.id);
    },
    targetAssignableEmployees: async (_p: unknown, args: { search?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, TARGETS_ROLES);
      return employeeTargetService.assignable(args.search);
    },
    employeeTargetSettings: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TARGETS_ROLES);
      return employeeTargetSettingsService.pub();
    },
    myEmployeeTargetsTable: async (_p: unknown, args: TableArgs, ctx: GraphQLContext) =>
      employeeTargetService.myTable(requireRole(ctx, EMPLOYEE_RW).id, args.query ?? undefined),
    myEmployeeTarget: async (_p: unknown, args: IdArgs, ctx: GraphQLContext) =>
      employeeTargetService.myById(args.id, requireRole(ctx, EMPLOYEE_RW).id),
    myDueEmployeeTargets: async (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      employeeTargetService.myDue(requireRole(ctx, EMPLOYEE_RW).id),
  },
  Mutation: {
    assignEmployeeTarget: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) =>
      employeeTargetService.assign(args.input, requireRole(ctx, TARGETS_ROLES)),
    updateEmployeeTarget: async (_p: unknown, args: IdArgs & { input: unknown }, ctx: GraphQLContext) =>
      employeeTargetService.update(args.id, args.input, requireRole(ctx, TARGETS_ROLES)),
    reviewEmployeeTarget: async (_p: unknown, args: IdArgs & { input: unknown }, ctx: GraphQLContext) =>
      employeeTargetService.review(args.id, args.input, requireRole(ctx, TARGETS_ROLES)),
    reopenEmployeeTarget: async (_p: unknown, args: IdArgs & { expected_revision: number }, ctx: GraphQLContext) =>
      employeeTargetService.reopen(args.id, args.expected_revision, requireRole(ctx, TARGETS_ROLES)),
    deleteEmployeeTarget: async (_p: unknown, args: IdArgs, ctx: GraphQLContext) =>
      employeeTargetService.remove(args.id, requireRole(ctx, TARGETS_ROLES)),
    updateEmployeeTargetSettings: async (
      _p: unknown,
      args: { input: EmployeeTargetSettingsInput },
      ctx: GraphQLContext
    ) => employeeTargetSettingsService.update(args.input ?? {}, requireRole(ctx, TARGETS_ROLES).id),
    submitEmployeeTarget: async (_p: unknown, args: IdArgs & { input: unknown }, ctx: GraphQLContext) =>
      employeeTargetService.submit(args.id, args.input, requireRole(ctx, EMPLOYEE_RW).id),
  },
};
