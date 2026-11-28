import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { EMPLOYEE_SELF_ROLES, HR_ROLES } from '@modules/hr/hr.roles';
import { adjustLeaveBalance } from './leave.adjust';
import { leaveDecisionService } from './leave.decision';
import { leaveQueries, toLeaveRequest } from './leave.queries';
import { leaveRequestService } from './leave.request';
import { leaveSettingsService } from './leave.settings';
import { leaveTypeService, toLeaveType } from './leave.types';

/**
 * Three gates. The HR console's seats run the HR half; the Employee console
 * reaches only the caller's own requests (every call is keyed by the session's
 * user id); and deciding is open to both, with `deciderSeat` checking server-side
 * that the caller is the reporting manager or HR — and never the requester.
 */
type Ctx = GraphQLContext;
type TableArgs = { query?: TableQueryInput | null };

const hr = (ctx: Ctx) => requireRole(ctx, HR_ROLES);
const self = (ctx: Ctx) => requireRole(ctx, EMPLOYEE_SELF_ROLES);
const DECIDER_ROLES = [...new Set([...EMPLOYEE_SELF_ROLES, ...HR_ROLES])];

/** Holidays are listed by calendar year; one query bound keeps the list to that year. */
const yearRange = (year: number) => ({ from: `${year}-01-01`, to: `${year}-12-31` });

export const hrLeaveResolvers = {
  Query: {
    hrLeaveRequestsTable: async (_p: unknown, args: TableArgs, ctx: Ctx) => {
      hr(ctx);
      return leaveQueries.hrTable(args.query ?? undefined);
    },
    hrLeaveTypes: async (_p: unknown, args: { include_inactive?: boolean | null }, ctx: Ctx) => {
      hr(ctx);
      return (await leaveTypeService.list(Boolean(args.include_inactive))).map(toLeaveType);
    },
    hrLeaveBalances: async (_p: unknown, args: { employee_id: string; year?: number | null }, ctx: Ctx) => {
      hr(ctx);
      return leaveQueries.hrBalances(args.employee_id, args.year);
    },
    hrLeaveSettings: async (_p: unknown, _a: unknown, ctx: Ctx) => {
      hr(ctx);
      return leaveSettingsService.pub();
    },
    hrHolidays: async (_p: unknown, args: { year: number }, ctx: Ctx) => {
      hr(ctx);
      const { from, to } = yearRange(args.year);
      return leaveSettingsService.holidays(from, to);
    },
    myLeaveOverview: async (_p: unknown, _a: unknown, ctx: Ctx) => leaveQueries.myOverview(self(ctx).id),
    myLeaveRequestsTable: async (_p: unknown, args: TableArgs, ctx: Ctx) => leaveQueries.myTable(self(ctx).id, args.query ?? undefined),
    myTeamLeaveRequestsTable: async (_p: unknown, args: TableArgs, ctx: Ctx) =>
      leaveQueries.teamTable(self(ctx).id, args.query ?? undefined),
    myLeavePreview: async (_p: unknown, args: { input: unknown }, ctx: Ctx) => leaveQueries.preview(self(ctx).id, args.input),
  },
  Mutation: {
    saveHrLeaveType: async (_p: unknown, args: { id?: string | null; input: unknown }, ctx: Ctx) =>
      leaveTypeService.save(args.id ?? null, args.input, hr(ctx).id),
    adjustHrLeaveBalance: async (_p: unknown, args: { input: unknown }, ctx: Ctx) => adjustLeaveBalance(args.input, hr(ctx)),
    cancelHrLeaveRequest: async (_p: unknown, args: { id: string; note: string }, ctx: Ctx) =>
      toLeaveRequest(await leaveRequestService.cancelAsHr(args.id, { note: args.note }, hr(ctx))),
    updateHrLeaveSettings: async (_p: unknown, args: { input: unknown }, ctx: Ctx) => leaveSettingsService.update(args.input, hr(ctx).id),
    saveHrHoliday: async (_p: unknown, args: { id?: string | null; input: unknown }, ctx: Ctx) =>
      leaveSettingsService.saveHoliday(args.id ?? null, args.input, hr(ctx).id),
    removeHrHoliday: async (_p: unknown, args: { id: string }, ctx: Ctx) => leaveSettingsService.removeHoliday(args.id, hr(ctx).id),
    applyLeave: async (_p: unknown, args: { input: unknown }, ctx: Ctx) =>
      toLeaveRequest(await leaveRequestService.apply(self(ctx).id, args.input)),
    cancelMyLeave: async (_p: unknown, args: { id: string; note?: string | null }, ctx: Ctx) =>
      toLeaveRequest(await leaveRequestService.cancelOwn(self(ctx).id, args.id, { note: args.note })),
    decideLeaveRequest: async (_p: unknown, args: { id: string; approve: boolean; note?: string | null }, ctx: Ctx) =>
      toLeaveRequest(
        await leaveDecisionService.decide(args.id, { approve: args.approve, note: args.note }, requireRole(ctx, DECIDER_ROLES))
      ),
  },
};
