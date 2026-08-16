import { GraphQLError } from 'graphql';
import { paymentService, computeQuote } from './payment.service';
import { paymentDetailService } from './payment.detail.service';
import { assertCheckoutEligible } from './checkout-eligibility';
import { PodModel } from '@modules/pods/pod/pod.model';
import type { GraphQLContext } from '@context';
import { hasRole, requireAuth, requireRole } from '@middleware/rbac';
import { validate } from '@utils/validate';
import {
  dummyCheckoutSchema,
  dummyGiftCardCheckoutSchema,
  dummyProductCheckoutSchema,
  giftCardCheckoutSchema,
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
    myPayment: (_p: unknown, args: { payment_doc_id: string }, ctx: GraphQLContext) => {
      // Scoped to the caller inside the query, so this needs no role — a buyer
      // can only ever read their own row.
      const u = requireAuth(ctx);
      return paymentService.getForUser(args.payment_doc_id, u.id);
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
    /*
      Every mutation below that STARTS a payment asserts the account is ready to
      pay first — a phone number to reach and a verified email for the receipt.
      Each input validator separately requires a billing address for its invoice.
      The account assertion is repeated per mutation rather than
      hidden in a wrapper so that adding a seventh way to pay without the gate
      is a visible omission in this file.

      verifyRazorpayPayment is deliberately NOT gated: by then the buyer's money
      has already moved, and refusing to record it would take the payment and
      lose the booking.
    */
    dummyCheckout: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      const input = await validate(dummyCheckoutSchema, args.input);
      await assertCheckoutEligible(u.id);
      return paymentService.dummyCheckout(input, u.id);
    },
    createRazorpayOrder: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      const input = await validate(razorpayOrderSchema, args.input);
      await assertCheckoutEligible(u.id);
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
      await assertCheckoutEligible(u.id);
      return paymentService.dummyProductCheckout(input, u.id);
    },
    createRazorpayProductOrder: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      const input = await validate(productCheckoutSchema, args.input);
      await assertCheckoutEligible(u.id);
      return paymentService.createRazorpayProductCheckout(input, u.id);
    },
    dummyGiftCardCheckout: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      const input = await validate(dummyGiftCardCheckoutSchema, args.input);
      await assertCheckoutEligible(u.id);
      return paymentService.dummyGiftCardCheckout(input, u.id);
    },
    createRazorpayGiftCardOrder: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      const input = await validate(giftCardCheckoutSchema, args.input);
      await assertCheckoutEligible(u.id);
      return paymentService.createRazorpayGiftCardCheckout(input, u.id);
    },
  },
};
