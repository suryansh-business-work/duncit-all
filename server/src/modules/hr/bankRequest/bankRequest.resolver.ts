import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { EMPLOYEE_SELF_ROLES, HR_ROLES } from '@modules/hr/hr.roles';
import { bankRequestService, toBankRequest } from './bankRequest.service';

/** HR decides; the Employee console only ever reaches the caller's own requests, keyed by the session. */
type Ctx = GraphQLContext;
const hr = (ctx: Ctx) => requireRole(ctx, HR_ROLES);
const self = (ctx: Ctx) => requireRole(ctx, EMPLOYEE_SELF_ROLES);

export const hrBankRequestResolvers = {
  Query: {
    hrBankChangeRequestsTable: async (_p: unknown, args: { query?: TableQueryInput | null }, ctx: Ctx) => {
      hr(ctx);
      return bankRequestService.hrTable(args.query ?? undefined);
    },
    hrBankChangeRequest: async (_p: unknown, args: { id: string }, ctx: Ctx) => bankRequestService.hrDetail(args.id, hr(ctx)),
    myBankAccount: async (_p: unknown, _a: unknown, ctx: Ctx) => bankRequestService.mine(self(ctx).id),
  },
  Mutation: {
    decideHrBankChangeRequest: async (_p: unknown, args: { id: string; approve: boolean; note?: string | null }, ctx: Ctx) =>
      toBankRequest(await bankRequestService.decide(args.id, { approve: args.approve, note: args.note }, hr(ctx))),
    requestMyBankChange: async (_p: unknown, args: { input: unknown }, ctx: Ctx) => toBankRequest(await bankRequestService.request(self(ctx).id, args.input)),
    cancelMyBankChange: async (_p: unknown, args: { id: string }, ctx: Ctx) => toBankRequest(await bankRequestService.cancelMine(self(ctx).id, args.id)),
  },
};
