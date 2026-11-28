import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { EMPLOYEE_SELF_ROLES, HR_ROLES } from '@modules/hr/hr.roles';
import { bankService } from './employee.bank';
import { compensationService } from './employee.compensation';
import { hireEmployee } from './employee.hire';
import { lifecycleService } from './employee.lifecycle';
import { selfService } from './employee.self';
import { employeeRow, employeeService } from './employee.service';

/**
 * Two gates. The HR console's seats run every HR operation; the Employee
 * console only ever reaches the caller's own record (selfService scopes every
 * call to the session's user id).
 */
type IdArgs = { id: string };
type Ctx = GraphQLContext;

const hr = (ctx: Ctx) => requireRole(ctx, HR_ROLES);

export const hrEmployeeResolvers = {
  Query: {
    hrEmployeesTable: async (_p: unknown, args: { query?: TableQueryInput | null }, ctx: Ctx) => {
      hr(ctx);
      return employeeService.table(args.query ?? undefined);
    },
    hrEmployee: async (_p: unknown, args: IdArgs, ctx: Ctx) => {
      hr(ctx);
      return employeeService.profile(args.id);
    },
    hrEmployeeHistory: async (_p: unknown, args: IdArgs, ctx: Ctx) => {
      hr(ctx);
      return employeeService.history(args.id);
    },
    hrEmployeeTargets: async (_p: unknown, args: IdArgs, ctx: Ctx) => {
      hr(ctx);
      return employeeService.targets(args.id);
    },
    hrEmployeeBankDetails: async (_p: unknown, args: IdArgs, ctx: Ctx) => bankService.reveal(args.id, hr(ctx)),
    hrManagerOptions: async (_p: unknown, args: { search?: string | null; exclude_id?: string | null }, ctx: Ctx) => {
      hr(ctx);
      return employeeService.managerOptions(args.search, args.exclude_id);
    },
    hrAccountOptions: async (_p: unknown, args: { search: string }, ctx: Ctx) => {
      hr(ctx);
      return employeeService.accountOptions(args.search);
    },
    hrUnrecordedEmployees: async (_p: unknown, _a: unknown, ctx: Ctx) => {
      hr(ctx);
      return employeeService.unrecorded();
    },
    hrEmployeeStats: async (_p: unknown, _a: unknown, ctx: Ctx) => {
      hr(ctx);
      return employeeService.stats();
    },
    myHrProfile: async (_p: unknown, _a: unknown, ctx: Ctx) => selfService.profile(requireRole(ctx, EMPLOYEE_SELF_ROLES).id),
  },
  Mutation: {
    hireHrEmployee: async (_p: unknown, args: { input: unknown }, ctx: Ctx) => {
      const created = await hireEmployee(args.input, hr(ctx));
      return employeeService.profile(String(created._id));
    },
    updateHrEmployeePersonal: async (_p: unknown, args: IdArgs & { input: unknown; expected_revision: number }, ctx: Ctx) =>
      employeeRow(await lifecycleService.updatePersonal(args.id, args.input, args.expected_revision, hr(ctx))),
    changeHrEmployeeJob: async (_p: unknown, args: IdArgs & { input: unknown }, ctx: Ctx) =>
      employeeRow(await lifecycleService.changeJob(args.id, args.input, hr(ctx))),
    addHrCompensation: async (_p: unknown, args: { employee_id: string; input: unknown }, ctx: Ctx) =>
      compensationService.add(args.employee_id, args.input, hr(ctx)),
    removeHrCompensation: async (_p: unknown, args: IdArgs, ctx: Ctx) => compensationService.remove(args.id, hr(ctx)),
    updateHrEmployeeBank: async (_p: unknown, args: IdArgs & { input: unknown; expected_revision: number }, ctx: Ctx) =>
      employeeRow(await bankService.update(args.id, args.input, args.expected_revision, hr(ctx))),
    scheduleHrEmployeeExit: async (_p: unknown, args: IdArgs & { input: unknown }, ctx: Ctx) =>
      employeeRow(await lifecycleService.scheduleExit(args.id, args.input, hr(ctx))),
    cancelHrEmployeeExit: async (_p: unknown, args: IdArgs & { expected_revision: number }, ctx: Ctx) =>
      employeeRow(await lifecycleService.cancelExit(args.id, args.expected_revision, hr(ctx))),
    rehireHrEmployee: async (_p: unknown, args: IdArgs & { input: unknown }, ctx: Ctx) =>
      employeeRow(await lifecycleService.rehire(args.id, args.input, hr(ctx))),
    restoreHrEmployeeAccess: async (_p: unknown, args: IdArgs, ctx: Ctx) =>
      employeeRow(await lifecycleService.restoreAccess(args.id, hr(ctx))),
    updateMyHrContact: async (_p: unknown, args: { input: unknown; expected_revision: number }, ctx: Ctx) =>
      selfService.updateContact(requireRole(ctx, EMPLOYEE_SELF_ROLES).id, args.input, args.expected_revision),
  },
};
