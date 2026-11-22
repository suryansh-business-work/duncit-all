import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { FailedPaymentCaseModel } from './failedPaymentCase.model';
import { reportPaymentFailure } from './failedPayment.report';
import { submitPaymentDeductionClaim } from './failedPayment.claim';
import { runVerification } from './failedPayment.verify';
import { initiateFailedPaymentRefund } from './failedPayment.refund';
import { markFailedPaymentNotRefundable, reviewFailedPayment } from './failedPayment.decision';
import { evidenceLink } from './failedPayment.evidence';
import { failedPaymentDetail, failedPaymentEvents, failedPaymentsTable } from './failedPayment.read';
import { actorOf } from './failedPayment.actor';
import {
  markNotRefundableSchema,
  parseInput,
  refundSchema,
  reportPaymentFailureSchema,
  reviewSchema,
  submitClaimSchema,
} from './failedPayment.validator';
import { EVIDENCE_READ, FAILED_PAYMENT_READ, FAILED_PAYMENT_WRITE } from './failedPayment.types';

const notFound = () => new GraphQLError('Failed payment not found', { extensions: { code: 'NOT_FOUND' } });

/** The detail a write answers with; a write always concerns an existing case. */
async function detailOrThrow(kase: Parameters<typeof failedPaymentDetail>[0]) {
  const detail = await failedPaymentDetail(kase);
  if (!detail) throw notFound();
  return detail;
}

export const failedPaymentResolvers = {
  Query: {
    failedPaymentsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, FAILED_PAYMENT_READ);
      return failedPaymentsTable(args.query);
    },
    failedPayment: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, FAILED_PAYMENT_READ);
      return failedPaymentDetail(args.id);
    },
    failedPaymentEvents: (_p: unknown, args: { case_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, FAILED_PAYMENT_READ);
      return failedPaymentEvents(args.case_id);
    },
    failedPaymentEvidenceLink: async (_p: unknown, args: { case_id: string; file_ref: string }, ctx: GraphQLContext) => {
      requireRole(ctx, EVIDENCE_READ);
      const { case_id } = parseInput(refundSchema.pick({ case_id: true }), args);
      const kase = await FailedPaymentCaseModel.findById(case_id).select('claims');
      if (!kase) throw notFound();
      return evidenceLink(kase, args.file_ref);
    },
  },
  Mutation: {
    reportPaymentFailure: (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return reportPaymentFailure(parseInput(reportPaymentFailureSchema, args.input), user.id);
    },
    submitPaymentDeductionClaim: (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return submitPaymentDeductionClaim(parseInput(submitClaimSchema, args.input), user.id);
    },
    reverifyFailedPayment: async (_p: unknown, args: { case_id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, FAILED_PAYMENT_WRITE);
      const { case_id } = parseInput(refundSchema.pick({ case_id: true }), args);
      const kase = await runVerification(case_id, await actorOf(user));
      if (!kase) throw notFound();
      return detailOrThrow(kase);
    },
    reviewFailedPayment: async (_p: unknown, args: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, FAILED_PAYMENT_WRITE);
      return detailOrThrow(await reviewFailedPayment(parseInput(reviewSchema, args), await actorOf(user)));
    },
    initiateFailedPaymentRefund: async (_p: unknown, args: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, FAILED_PAYMENT_WRITE);
      const input = parseInput(refundSchema, args);
      return detailOrThrow(await initiateFailedPaymentRefund(input.case_id, input.client_request_id, await actorOf(user)));
    },
    markFailedPaymentNotRefundable: async (_p: unknown, args: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, FAILED_PAYMENT_WRITE);
      return detailOrThrow(await markFailedPaymentNotRefundable(parseInput(markNotRefundableSchema, args), await actorOf(user)));
    },
  },
};
