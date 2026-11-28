import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { EMPLOYEE_SELF_ROLES } from '@modules/hr/hr.roles';
import { myCalendar } from './calendar.service';

/** Keyed by the session's own account: a calendar never shows anyone else's view. */
export const myHrCalendarResolvers = {
  Query: {
    myHrCalendar: async (_p: unknown, args: { month: string }, ctx: GraphQLContext) =>
      myCalendar(requireRole(ctx, EMPLOYEE_SELF_ROLES).id, { month: args.month }),
  },
};
