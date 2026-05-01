import { paymentService, computeQuote } from './payment.service';
import { PodModel } from '../pod/pod.model';
import type { GraphQLContext } from '../../context';
import { requireAuth, requireRole } from '../../middleware/rbac';

const ADMIN_RW = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const paymentResolvers = {
  Payment: {
    pod: async (parent: any) => {
      if (!parent.pod_id) return null;
      const p = await PodModel.findById(parent.pod_id);
      if (!p) return null;
      return {
        id: String(p._id),
        pod_id: (p as any).pod_id,
        pod_title: (p as any).pod_title,
        pod_date_time: (p as any).pod_date_time?.toISOString?.() ?? null,
        pod_amount: (p as any).pod_amount,
      };
    },
  },
  Query: {
    payments: (_p: unknown, args: { filter?: any; limit?: number }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return paymentService.list(args.filter, args.limit ?? 200);
    },
    payment: (_p: unknown, args: { payment_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return paymentService.getById(args.payment_doc_id);
    },
    myPayments: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return paymentService.listForUser(u.id);
    },
    checkoutQuote: async (_p: unknown, args: { input: { amount: number; pod_id?: string } }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return computeQuote(args.input.amount);
    },
  },
  Mutation: {
    dummyCheckout: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return paymentService.dummyCheckout(args.input, u.id);
    },
  },
};
