import { GraphQLError } from 'graphql';
import { paymentService, computeQuote } from './payment.service';
import { paymentDetailService } from './payment.detail.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import type { GraphQLContext } from '@context';
import { hasRole, requireAuth, requireRole } from '@middleware/rbac';
import { validate } from '@utils/validate';
import {
  dummyCheckoutSchema,
  dummyProductCheckoutSchema,
  productCheckoutSchema,
  productShippingQuoteSchema,
  razorpayOrderSchema,
  verifyRazorpaySchema,
} from './payment.validator';

const ADMIN_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];
// Read-only payment views. ZONAL_ADMIN opens the Admin pod-details page, whose
// Payments section lists a pod's transactions — same read scope it already has
// on podFinanceBreakdown and adminPodAttendees. Mutations stay on ADMIN_RW.
const ADMIN_READ = [...ADMIN_RW, 'ZONAL_ADMIN'];

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
      requireRole(ctx, ADMIN_READ);
      return paymentService.list(args.filter, args.limit ?? 200);
    },
    paymentTotals: (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      return paymentService.totals(args.filter);
    },
    paymentsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      return paymentService.table(args.query);
    },
    payment: (_p: unknown, args: { payment_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      return paymentService.getById(args.payment_doc_id);
    },
    paymentDetail: async (_p: unknown, args: { payment_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      const detail = await paymentDetailService.detail(args.payment_doc_id);
      if (!detail) {
        throw new GraphQLError('Payment not found', { extensions: { code: 'NOT_FOUND' } });
      }
      return detail;
    },
    myPayments: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return paymentService.listForUser(u.id);
    },
    checkoutQuote: async (
      _p: unknown,
      args: { input: { amount: number; pod_id?: string; seats?: number | null } },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      return paymentService.quoteCheckout(args.input);
    },
    paymentInvoicePdfBase64: (_p: unknown, args: { payment_doc_id: string }, ctx: GraphQLContext) => {
      // The buyer can download their own invoice; admins (support/finance) any.
      const u = requireAuth(ctx);
      return paymentService.invoicePdfBase64(args.payment_doc_id, u.id, hasRole(u, ADMIN_RW));
    },
    productShippingQuote: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const input = await validate(productShippingQuoteSchema, args.input);
      return paymentService.productShippingQuote(input);
    },
  },
  Mutation: {
    dummyCheckout: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      const input = await validate(dummyCheckoutSchema, args.input);
      return paymentService.dummyCheckout(input, u.id);
    },
    createRazorpayOrder: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      const input = await validate(razorpayOrderSchema, args.input);
      return paymentService.createRazorpayCheckout(input, u.id);
    },
    verifyRazorpayPayment: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      const input = await validate(verifyRazorpaySchema, args.input);
      return paymentService.verifyRazorpayCheckout(input, u.id);
    },
    refundPayment: (_p: unknown, args: { payment_doc_id: string; reason?: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return paymentService.refund(args.payment_doc_id, args.reason);
    },
    dummyProductCheckout: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      const input = await validate(dummyProductCheckoutSchema, args.input);
      return paymentService.dummyProductCheckout(input, u.id);
    },
    createRazorpayProductOrder: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      const input = await validate(productCheckoutSchema, args.input);
      return paymentService.createRazorpayProductCheckout(input, u.id);
    },
  },
};
